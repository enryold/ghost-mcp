# Use Node.js official image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies needed for build) without running prepare script
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --omit=dev

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ghostmcp -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R ghostmcp:nodejs /app
USER ghostmcp

# Expose port (though MCP uses stdio, this is for documentation)
EXPOSE 3000

# Run the server
CMD ["npm", "start"]