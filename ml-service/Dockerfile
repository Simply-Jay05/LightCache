FROM python:3.12-slim

WORKDIR /app

# Install libgomp — required by LightGBM for OpenMP parallel processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    --trusted-host pypi.org \
    --trusted-host files.pythonhosted.org

# Copy source and trained model
COPY . .

EXPOSE 8000

CMD ["python", "app.py"]
