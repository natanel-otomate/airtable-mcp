FROM node:20-slim

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy entire source directory structure
# Note: Railway's build context should include all files from the repo
COPY src/ ./src/
COPY bin/ ./bin/

# Verify source files are present before building
RUN test -d src/typescript && echo "✓ src/typescript directory exists" || (echo "✗ src/typescript not found" && ls -la src/ && exit 1)
RUN test -f src/typescript/airtable-mcp-server.ts && echo "✓ airtable-mcp-server.ts found" || (echo "✗ airtable-mcp-server.ts not found" && find src -name "*.ts" | head -5 && exit 1)

# Build TypeScript to JavaScript
RUN npm run build

# Verify build output exists
RUN test -f dist/typescript/airtable-mcp-server.js && echo "✓ Build successful" || (echo "✗ Build failed - dist/typescript/airtable-mcp-server.js not found" && ls -la dist/ 2>/dev/null || echo "dist directory does not exist" && exit 1)

# Remove dev dependencies to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Expose HTTP port (Railway will assign the actual port via PORT env var)
EXPOSE 8080

# Set environment variable for HTTP mode
# Note: Railway auto-assigns PORT, but we set a default for local testing
ENV PORT=${PORT:-8080}
ENV NODE_ENV=production

# Start the server
# Railway will override this with startCommand, but this is the fallback
CMD ["node", "dist/typescript/airtable-mcp-server.js"]
