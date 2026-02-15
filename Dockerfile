# Multi-stage build für Astro App
# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install ffmpeg for video thumbnail generation
RUN apk add --no-cache ffmpeg

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3002

# Copy necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
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
CMD ["npm", "start"]
