import numpy as np


def predict_ttl(ttl_model_bundle: dict, X, ttl_min: int = 30) -> np.ndarray:
    clf     = ttl_model_bundle["stage1_classifier"]
    reg     = ttl_model_bundle["stage2_regressor"]
    ttl_max = ttl_model_bundle.get("ttl_max", 1800)

    # Stage 1: will this key be "censored" (hit TTL_MAX)?
    prob_capped = clf.predict_proba(X)[:, 1]
    is_capped   = (prob_capped >= 0.5)

    # Stage 2: predicted real TTL for non-capped rows
    reg_preds = reg.predict(X).clip(ttl_min, ttl_max - 1)

    # Combine: censored rows → TTL_MAX; real rows → regression output
    result = np.where(is_capped, float(ttl_max), reg_preds)
    return result.clip(ttl_min, ttl_max)