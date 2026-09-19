FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY public ./public
COPY src ./src
ENV GENERATE_SOURCEMAP=false
RUN npm run build

FROM node:22-alpine AS server-dependencies
WORKDIR /app/cms-server
COPY cms-server/package.json cms-server/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app
COPY --from=server-dependencies /app/cms-server ./cms-server
COPY cms-server/*.js ./cms-server/
COPY --from=build /app/build ./build
USER node
EXPOSE 8080
CMD ["node", "cms-server/index.js"]
