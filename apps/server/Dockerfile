FROM node:20-alpine AS base
WORKDIR /app
COPY package.json .
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install
COPY . .
RUN npm run build --workspace @trucopro/shared && npm run build --workspace @trucopro/server
EXPOSE 4000
CMD ["npm","run","start","--workspace","@trucopro/server"]
