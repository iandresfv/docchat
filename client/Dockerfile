# syntax=docker/dockerfile:1

# --- build -------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
# corepack is gone from Node >= 25; install pnpm explicitly (05-OPS §3).
RUN npm install -g pnpm@12.6.0
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
ARG VITE_APP_NAME=DocChat
ENV VITE_APP_NAME=${VITE_APP_NAME}
RUN pnpm build \
    # The MSW worker is a dev/test tool; never ship it.
    && rm -f dist/mockServiceWorker.js

# --- runtime -----------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
ARG VERSION=dev
ARG REVISION=unknown
LABEL org.opencontainers.image.title="docchat-client" \
      org.opencontainers.image.description="DocChat single-page app served by nginx" \
      org.opencontainers.image.source="https://github.com/iandresfv/docchat" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}"
# Rendered by the image's envsubst entrypoint into conf.d/default.conf.
ENV API_UPSTREAM=http://docchat-api
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
USER 101
