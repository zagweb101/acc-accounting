FROM node:22-slim AS base
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -qq && apt-get install -y --no-install-recommends python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG AUTH_SECRET
ENV AUTH_SECRET=$AUTH_SECRET

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
