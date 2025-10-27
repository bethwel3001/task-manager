FROM node:18-alpine

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package*.json ./

# Install dependencies using pnpm
RUN pnpm install

# Copy source code
COPY . .

# Build the application using pnpm
RUN pnpm run build

# Install serve to run the built application
RUN npm install -g serve

# Expose port
EXPOSE 4173

# Serve the built application
CMD ["serve", "-s", "dist", "-l", "4173"]