#!/bin/sh
# neXgen Core — container entrypoint.
#
# Dispatches on the command the container was started with, per
# ARCH:DEPLOYMENT_TOPOLOGY: the same image serves as the Application Unit
# (php-fpm), the Background Worker (queue:work), or a one-off console/
# migration invocation, never mixing roles within a single running instance.
set -e

case "$1" in
  php-fpm)
    exec php-fpm --nodaemonize
    ;;
  worker)
    # --tries and --backoff make retry behavior explicit rather than
    # relying on the default, per PRINCIPLES:EXPLICIT_FAILURE — a job that
    # keeps failing must eventually stop retrying silently forever.
    exec php artisan queue:work redis \
      --queue=default \
      --sleep=1 \
      --tries=3 \
      --backoff=5 \
      --max-time=3600
    ;;
  scheduler)
    exec php artisan schedule:work
    ;;
  *)
    exec "$@"
    ;;
esac
