# VALE Shoes — one container: API + storefront. Needs Node >= 22.13 (built-in SQLite).
# Persistent data: mount ONE volume at /data (database in /data/db, product photos in /data/uploads).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
COPY server/package.json server/package-lock.json server/
COPY client/package.json client/package-lock.json client/
RUN npm ci --prefix server && npm ci --prefix client
COPY . .
RUN npm run build && npm prune --omit=dev --prefix server

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data/db \
    UPLOAD_DIR=/data/uploads
COPY --from=build /app/server/package.json server/package.json
COPY --from=build /app/server/node_modules server/node_modules
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/seed server/seed
COPY --from=build /app/server/demo-images server/demo-images
COPY --from=build /app/shared shared
COPY --from=build /app/client/dist client/dist
EXPOSE 8080
CMD ["node", "--disable-warning=ExperimentalWarning", "server/dist/index.js"]
