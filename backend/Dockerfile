FROM node:20-alpine

WORKDIR /app

# Only copy package.json — not package-lock.json (Windows-generated)
COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 9000

# server.js is at /app/server.js inside the container
# (backend/ folder contents are copied directly into /app)
CMD ["node", "server.js"]
