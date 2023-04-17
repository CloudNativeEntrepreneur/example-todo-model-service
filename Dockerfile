FROM node:19.9.0-alpine3.16 as build

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY src/ src/
COPY __tests__/ __tests__/
COPY tsconfig.json ./

RUN npm run build
RUN npm prune --production

FROM node:19.9.0-alpine3.16

WORKDIR /usr/src/app

COPY --from=build /build/node_modules/ node_modules/
COPY --from=build /build/dist/ dist/
COPY --from=build /build/package.json /build/package-lock.json dist/

ENV HANDLER_BASE_PATH=dist
ENV PORT=5011
EXPOSE ${PORT}

CMD node ./dist/bin/start.js