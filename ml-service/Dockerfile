FROM python:3.12-slim

WORKDIR /app

# Install libgomp (LightGBM) and supervisor (process manager)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir \
    --timeout 300 \
    --retries 5 \
    -r requirements.txt \
    --trusted-host pypi.org \
    --trusted-host files.pythonhosted.org

# Copy source and trained model
COPY . .

# Copy supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/lightcache.conf

EXPOSE 8000

# Run both app.py and retrain_scheduler.py via supervisord
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/lightcache.conf"]
