#!/bin/sh
set -eu

if [ "${GENERATE_API:-true}" = "true" ]; then
  exec pnpm build
fi
