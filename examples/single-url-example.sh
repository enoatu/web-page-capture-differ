#!/bin/sh

docker-compose run -T --rm capture node capture \
  -w1000 \
  --dirPrefix=pc- \
  --outputOnlyDiff=true \
  --additionalWaitTime=1500 \
  --captureIfNotExist1=true \
  --captureIfNotExist2=true \
  https://enoatu.github.io/DevUtils/change-indent \
  http://host.docker.internal:41210/change-indent
