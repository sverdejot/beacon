FROM node:lts AS build
WORKDIR /app

COPY ./dashboard .

RUN npm install
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./build/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4321
CMD ["nginx", "-g", "daemon off;"]
