# Development Dockerfile for Turborepo monorepo
FROM node:22-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package directories (for workspace resolution)
COPY packages/cli/package.json packages/cli/
COPY packages/core/package.json packages/core/
COPY packages/web/package.json packages/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Expose web port
EXPOSE 3000

# Development command
CMD ["pnpm", "dev", "--filter", "@agentmine/web"]
