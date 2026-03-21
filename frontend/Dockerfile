# This copies the pre-built dist/ folder into nginx — no npm install needed
# inside Docker, so no network timeouts or platform compatibility issues.

FROM nginx:alpine

COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
