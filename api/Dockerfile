# Build from the repo root:  docker build -f api/Dockerfile -t matsci-api .
FROM node:24-slim
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter . --filter matsci-api
ENV PORT=3000
EXPOSE 3000
CMD ["pnpm", "--filter", "matsci-api", "start"]
