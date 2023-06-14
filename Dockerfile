FROM node:20-alpine as base

RUN apk update && \
    apk add mongodb-tools && \
    rm -rf /var/cache/apk/*

FROM base as packages
WORKDIR /pkg

ENV NODE_ENV=production
COPY ./package.json ./yarn.lock /pkg/

RUN yarn install \ 
    --frozen-lockfile \
    --production

FROM base as run
WORKDIR /app

COPY --from=packages /pkg/node_modules /app/node_modules/

COPY ./src /app/src/
COPY ./package.json /app/

CMD ["node", "src/index.js"]