# Use Node.js LTS image as base
FROM node:23-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

COPY .env .env

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Expose the port your app runs on
ENV PORT=3000
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]