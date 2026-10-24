FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
# El binario de Cypress no hace falta para construir el bundle
ENV CYPRESS_INSTALL_BINARY=0
RUN npm ci
COPY . .
ARG VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
