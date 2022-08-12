ARG BASE=node:16.16.0-bullseye-slim
FROM ${BASE}

WORKDIR /app

USER root

# タイムゾーン設定
RUN ln -sf /usr/share/zoneinfo/Asia/Tokyo /etc/localtime \
    && dpkg-reconfigure --frontend noninteractive tzdata

# 以下を参考
# https://github.com/puppeteer/puppeteer/blob/v5.2.0/docs/troubleshooting.md#running-puppeteer-in-docker

RUN set -ex \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        fonts-ipafont-gothic fonts-ipafont-mincho \
        sudo \
        chromium \
        chromium-l10n \
        imagemagick

RUN rm -rf /var/lib/apt/lists/* \
    && rm -rf /src/*.deb

# sudo
RUN echo 'node ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/node

RUN mkdir -p /node/app && chown -R node:node /node
WORKDIR /node

# ボリュームマウント外にnode権限でnode_modulesを作る
USER node
COPY --chown=node:node package.json package-lock.json ./
ENV PATH /node/node_modules/.bin:$PATH
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
RUN npm install
WORKDIR /node/app
COPY --chown=node:node . .
