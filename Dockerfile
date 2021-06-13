FROM node:lts-alpine

LABEL maintainer="sublimer@sublimer.me"

WORKDIR /root
COPY package.json .
COPY package-lock.json .
RUN npm ci
COPY ./src ./src
COPY tsconfig.json .
RUN npm run build
EXPOSE 3000
CMD [ "npm", "start" ]