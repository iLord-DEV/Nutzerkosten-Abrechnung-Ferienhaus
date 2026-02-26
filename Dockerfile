# Multi-stage build für Astro App
# Stage 1: Dependencies
FROM node:22-alpine AS deps

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm exec prisma generate

# Stage 2: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN pnpm run build

# Stage 3: Runner
FROM node:22-alpine AS runner

WORKDIR /app

# Install ffmpeg for video thumbnail generation
RUN apk add --no-cache ffmpeg

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3002

# Copy necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.mjs ./server.mjs

# Ensure upload directory exists and is writable
RUN mkdir -p /app/dist/client/uploads

# Run as unprivileged user (node user is built into node:alpine)
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 3002

# Start the application
CMD ["pnpm", "start"]
