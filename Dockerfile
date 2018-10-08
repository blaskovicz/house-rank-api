FROM node:8-alpine
EXPOSE 4095
WORKDIR /home/node
USER node:node
COPY --chown=node:node . .
ENV LOG_LEVEL=info \
    PORT=4095 \
    ZWSID=some-id \
    GOOGLE_CLIENT_ID=some-id.some-googledomain.com \
    DATABASE_URL=postgres://user:pass@host:port/db \
    NODE_ENV=development
RUN yarn install && \
    yarn lint && \
    yarn build
CMD yarn start