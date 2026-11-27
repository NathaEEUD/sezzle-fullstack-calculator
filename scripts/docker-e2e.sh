#!/bin/sh
# Runs the e2e suite against the built image: checks it runs as the distroless
# nonroot user, starts one container, waits for /healthz, and always removes it.
# Extra arguments go to `playwright test` (`make evidence DOCKER=1` passes --grep).
set -eu

image=$1
shift
port=8788
base="http://localhost:$port"

user=$(docker image inspect --format '{{.Config.User}}' "$image")
if [ "$user" != "nonroot:nonroot" ]; then
  echo "docker-e2e: $image runs as '$user', want 'nonroot:nonroot'" >&2
  exit 1
fi

container=$(docker run --rm --detach --publish "127.0.0.1:$port:8080" "$image")
trap 'docker rm --force "$container" >/dev/null' EXIT

tries=0
until curl --silent --fail "$base/healthz" >/dev/null; do
  tries=$((tries + 1))
  if [ "$tries" -ge 50 ]; then
    echo "docker-e2e: $image did not answer $base/healthz" >&2
    docker logs "$container" >&2
    exit 1
  fi
  sleep 0.2
done

cd e2e && E2E_BASE_URL=$base npx playwright test "$@"
