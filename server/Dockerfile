FROM node:18-alpine

# Install build dependencies for bcrypt
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
EXPOSE 4000
CMD ["node","src/index.js"]
