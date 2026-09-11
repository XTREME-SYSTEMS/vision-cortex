FROM node:20-slim

WORKDIR /app

# Copy worker package configuration
COPY worker/package*.json ./worker/

# Install worker dependencies
RUN cd worker && npm install

# Copy base44 runtime and worker code
COPY base44 ./base44
COPY worker ./worker

# Build worker distribution
RUN cd worker && npm run build

WORKDIR /app/worker

EXPOSE 3000

CMD ["node", "dist/worker.js"]
