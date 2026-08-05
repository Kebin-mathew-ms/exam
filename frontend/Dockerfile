# --- Build Stage ---
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime Stage ---
FROM nginx:1.25-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 for proxy routing
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
