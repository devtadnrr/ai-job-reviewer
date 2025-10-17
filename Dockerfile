FROM node:20-alpine

WORKDIR /app

# Install dependencies required for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy everything
COPY . .

# Remove old generated Prisma client and regenerate for Linux
RUN rm -rf src/generated/prisma && npx prisma generate

# Create directories
RUN mkdir -p uploads logs

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]
