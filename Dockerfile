FROM node:22.13.1 AS builder

WORKDIR /usr/src/app

COPY . /usr/src/app


RUN npm install -g @angular/cli

RUN npm install

WORKDIR /opt/

RUN ng build

RUN echo "Building client image done"

FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]