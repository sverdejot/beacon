FROM node:lts AS build
WORKDIR /app

COPY ./dashboard .

RUN npm install
RUN npm run build

FROM nginx:alpine AS runtime
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown appuser:appgroup /var/run/nginx.pid
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./build/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

USER appuser
EXPOSE 4321
CMD ["nginx", "-g", "daemon off;"]
