# See https://blog.maximerouiller.com/post/how-to-build-a-multistage-dockerfile-for-spa-and-static-sites/
FROM node:lts-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN mkdir ./public && ./node_modules/.bin/generate-attribution && cp ./oss-attribution/licenseInfos.json ./public/licenseInfos.json
COPY . .
ENV PUBLIC_URL=https://covid-viz.metapathy.com
RUN npm run build

FROM nginx:stable-alpine as production-stage

COPY --from=build-stage /app/build /usr/share/nginx/html

EXPOSE 80