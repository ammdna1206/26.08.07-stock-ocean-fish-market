FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.16.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY server/tsconfig.json server/tsconfig.json
RUN pnpm install --frozen-lockfile

COPY server server
COPY shared shared
RUN pnpm build:server

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.16.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/server/src/index.js"]
