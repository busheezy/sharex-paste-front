#!/bin/bash

set -euo pipefail

if [ "true" == "$GENERATE_API" ]; then
  sleep 10
  curl ${TYPES_URL} --output /vite-sharex/spec.json
  pnpm openapi --input /vite-sharex/spec.json --output /vite-sharex/src/api
fi

pnpm build