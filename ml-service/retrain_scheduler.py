import json
import logging
import os
import pickle
import shutil
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests

# ── Config ────────────────────────────────────────────────────────────────────
RETRAIN_INTERVAL_DAYS = int(os.getenv("RETRAIN_INTERVAL_DAYS", "3"))
ROLLING_WINDOW_DAYS   = int(os.getenv("ROLLING_WINDOW_DAYS",   "30"))
MIN_ROWS_TO_RETRAIN   = int(os.getenv("MIN_ROWS_TO_RETRAIN",   "1000"))
ML_SERVICE_URL        = os.getenv("ML_SERVICE_URL", "http://localhost:8000")

BASE_DIR     = Path(__file__).parent
DATA_FILE    = BASE_DIR / "logs" / "cache_events.jsonl"
HISTORY_FILE = BASE_DIR / "model" / "retrain_history.json"
MODEL_PATH   = BASE_DIR / "model" / "lightcache_model.pkl"
MODEL_BACKUP = BASE_DIR / "model" / "lightcache_model_backup.pkl"

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [RETRAIN] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────
def load_history() -> list:
    if HISTORY_FILE.exists():
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    return []


def save_history(history: list):
    HISTORY_FILE.parent.mkdir(exist_ok=True)
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)


def get_last_retrain_time(history: list):
    if not history:
        return None
    return datetime.fromisoformat(history[-1]["retrained_at"])


def count_rows_in_window(data_file: Path, window_days: int) -> int:
    """Count rows within the rolling window without loading everything."""
    if not data_file.exists():
        return 0
    cutoff_ms = (datetime.now() - timedelta(days=window_days)).timestamp() * 1000
    count = 0
    with open(data_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                ts  = float(row.get("timestamp", 0))
                if ts >= cutoff_ms:
                    count += 1
            except Exception:
                continue
    return count


def filter_rolling_window(data_file: Path, window_days: int) -> Path:
    """
    Write a temporary file containing only rows within the rolling window.
    Returns path to the temp file.
    """
    cutoff_ms = (datetime.now() - timedelta(days=window_days)).timestamp() * 1000
    temp_file = data_file.parent / "cache_events_window.jsonl"

    kept = 0
    with open(data_file, "r", encoding="utf-8") as fin, \
         open(temp_file, "w", encoding="utf-8") as fout:
        for line in fin:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                ts  = float(row.get("timestamp", 0))
                if ts >= cutoff_ms:
                    fout.write(line + "\n")
                    kept += 1
            except Exception:
                continue

    log.info(f"Rolling window filter: kept {kept:,} rows from last {window_days} days")
    return temp_file


def backup_current_model():
    """Keep a copy of the current model before overwriting."""
    if MODEL_PATH.exists():
        shutil.copy2(MODEL_PATH, MODEL_BACKUP)
        log.info(f"Backed up current model to {MODEL_BACKUP.name}")


def signal_hot_reload():
    """
    Tell the running FastAPI service to reload the model from disk.
    Returns True if successful, False if service unreachable.
    """
    try:
        response = requests.post(
            f"{ML_SERVICE_URL}/admin/reload",
            timeout=10,
        )
        if response.status_code == 200:
            log.info("✅ FastAPI service hot-reloaded new model")
            return True
        else:
            log.warning(f"Hot reload returned {response.status_code}")
            return False
    except Exception as e:
        log.warning(f"Could not signal hot reload: {e}")
        return False


def run_retraining(data_file: Path) -> dict:
    """
    Run the full training pipeline. Returns metrics dict.
    Imports train.py functions directly to avoid subprocess overhead.
    """
    # Import train module functions
    import sys
    sys.path.insert(0, str(BASE_DIR))
    from train import load_data, engineer_features, build_targets, train, save_models

    log.info(f"Loading data from: {data_file}")
    df = load_data(data_file)

    log.info("Engineering features...")
    df = engineer_features(df)

    log.info("Building targets...")
    df = build_targets(df)

    log.info("Training models...")
    ttl_model, evict_model, prefetch_model = train(df)

    log.info("Saving models...")
    save_models(ttl_model, evict_model, prefetch_model, df)

    # Extract metrics from the trained models
    from sklearn.metrics import mean_absolute_error, r2_score
    from sklearn.model_selection import train_test_split
    import numpy as np

    FEATURE_COLS = [
        "route_type_enc", "page_type_enc", "price_tier_enc", "is_single_item",
        "hour_of_day", "weekday", "is_peak_hour",
        "hour_sin", "hour_cos", "day_sin", "day_cos",
        "past_access_count", "log_past_count", "rolling_hit_rate",
        "time_since_last_request", "request_interval_mean", "request_interval_std",
    ]

    X = df[FEATURE_COLS].fillna(0)
    y = df["dynamic_ttl"]
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    preds = ttl_model.predict(X_test)

    return {
        "training_rows":  len(df),
        "ttl_mae":        round(float(mean_absolute_error(y_test, preds)), 2),
        "ttl_r2":         round(float(r2_score(y_test, preds)), 3),
    }


# ══════════════════════════════════════════════════════════════════════════════
# Main loop
# ══════════════════════════════════════════════════════════════════════════════
def should_retrain(history: list) -> tuple[bool, str]:
    """Returns (should_retrain, reason)."""
    last = get_last_retrain_time(history)

    if last is None:
        return True, "No previous retraining found — running initial train"

    next_retrain = last + timedelta(days=RETRAIN_INTERVAL_DAYS)
    now = datetime.now()

    if now < next_retrain:
        remaining = next_retrain - now
        hours = int(remaining.total_seconds() // 3600)
        return False, f"Next retrain in {hours}h (scheduled: {next_retrain.strftime('%Y-%m-%d %H:%M')})"

    return True, f"Interval of {RETRAIN_INTERVAL_DAYS} days elapsed since {last.strftime('%Y-%m-%d %H:%M')}"


def main():
    log.info("=" * 55)
    log.info("  LightCache — Retraining Scheduler")
    log.info(f"  Interval  : every {RETRAIN_INTERVAL_DAYS} days")
    log.info(f"  Window    : last {ROLLING_WINDOW_DAYS} days of data")
    log.info(f"  Min rows  : {MIN_ROWS_TO_RETRAIN:,}")
    log.info(f"  Data file : {DATA_FILE}")
    log.info("=" * 55)

    CHECK_INTERVAL_SECONDS = 60 * 60  # check every hour

    while True:
        try:
            history = load_history()
            do_retrain, reason = should_retrain(history)
            log.info(f"Check: {reason}")

            if do_retrain:
                # Count available rows in window
                row_count = count_rows_in_window(DATA_FILE, ROLLING_WINDOW_DAYS)
                log.info(f"Rows in rolling window: {row_count:,} (minimum: {MIN_ROWS_TO_RETRAIN:,})")

                if row_count < MIN_ROWS_TO_RETRAIN:
                    log.warning(
                        f"Not enough data ({row_count} rows). "
                        f"Need {MIN_ROWS_TO_RETRAIN}. Skipping this cycle."
                    )
                else:
                    log.info("Starting retraining...")
                    start = time.time()

                    # Back up current model before overwriting
                    backup_current_model()

                    # Filter to rolling window
                    window_file = filter_rolling_window(DATA_FILE, ROLLING_WINDOW_DAYS)

                    try:
                        # Run training
                        metrics = run_retraining(window_file)
                        elapsed = round(time.time() - start, 1)

                        # Signal hot reload
                        reloaded = signal_hot_reload()

                        # Save to history
                        entry = {
                            "retrained_at":   datetime.now().isoformat(),
                            "training_rows":  metrics["training_rows"],
                            "ttl_mae":        metrics["ttl_mae"],
                            "ttl_r2":         metrics["ttl_r2"],
                            "elapsed_seconds": elapsed,
                            "hot_reloaded":   reloaded,
                            "window_days":    ROLLING_WINDOW_DAYS,
                        }
                        history.append(entry)
                        save_history(history)

                        log.info(
                            f"✅ Retraining complete in {elapsed}s — "
                            f"MAE: {metrics['ttl_mae']}s, R²: {metrics['ttl_r2']}, "
                            f"rows: {metrics['training_rows']:,}"
                        )

                    except Exception as e:
                        log.error(f"Retraining failed: {e}")
                        # Restore backup if training failed midway
                        if MODEL_BACKUP.exists():
                            shutil.copy2(MODEL_BACKUP, MODEL_PATH)
                            log.info("Restored backup model after failed retrain")
                    finally:
                        # Clean up temp window file
                        if window_file.exists():
                            window_file.unlink()

        except Exception as e:
            log.error(f"Scheduler error: {e}")

        log.info(f"Sleeping {CHECK_INTERVAL_SECONDS // 3600}h until next check...")
        time.sleep(CHECK_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
# Note: app.py additions are in the separate app.py file