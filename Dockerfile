FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source files
COPY src/ ./src/
COPY bin/ ./bin/

# Build TypeScript to JavaScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Expose HTTP port
EXPOSE 8080

# Set environment variable for HTTP mode
ENV PORT=8080
ENV NODE_ENV=production

# Start the server
CMD ["node", "dist/typescript/airtable-mcp-server.js"]
