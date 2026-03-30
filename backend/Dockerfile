FROM node:20-alpine

WORKDIR /app

# Install supervisor to run server.js + logConsumer.js as sibling processes.
# logConsumer.js flushes Redis Stream events to /app/logs/cache_events.jsonl, which is on the shared logs_data volume the ml-service reads for benchmarking and model retraining.
RUN apk add --no-cache supervisor

# Only copy package.json — not package-lock.json (Windows-generated)
COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 9000

# supervisord starts both server.js (API) and logConsumer.js (log flusher)
CMD ["supervisord", "-c", "/app/supervisord.conf"]
