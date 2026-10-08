# The matrix under a Node this machine does not have. Built and run by `matrix.sh --docker`.
ARG NODE=22
# slim: nothing we install compiles native code, esbuild ships a prebuilt binary
FROM node:${NODE}-slim
WORKDIR /integrations

# what check.sh needs that slim leaves out: curl for every assertion, procps for the pkill in its trap
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl procps \
  && rm -rf /var/lib/apt/lists/*

# manifests first, so the install layer caches until a dependency actually changes
COPY package.json package-lock.json ./
COPY nodejs/core/package.json nodejs/core/
COPY nodejs/express/package.json nodejs/express/
COPY nodejs/fastify/package.json nodejs/fastify/
COPY nodejs/nestjs/package.json nodejs/nestjs/
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

ENTRYPOINT ["bash", "nodejs/scripts/matrix.sh"]
