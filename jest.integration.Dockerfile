FROM node:18.12.1-alpine3.16 as build

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY src src
COPY __tests__ __tests__
COPY jest.integration.json .*rc ./
COPY tsconfig.json ./

CMD npm run test:integration