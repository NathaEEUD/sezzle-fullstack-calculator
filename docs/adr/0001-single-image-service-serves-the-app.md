# One Docker image; the service serves the built app when told to

The full stack ships as a single image. A multi-stage build compiles the React app and the Go service, and the Go binary serves both the API and, when `STATIC_DIR` is set, the built app's static files from the same origin. We picked this over two containers behind nginx and compose because the brief asks for one Dockerfile, a single `docker run` is the easiest thing for an evaluator to start, and serving from one origin means production needs no CORS. Without `STATIC_DIR` the service is an API-only microservice, so serving files is opt-in deployment glue and not part of the service's job.

## Considered Options

- **Two containers + compose (nginx serves the app and proxies `/api`)**: the conventional split, but it means more moving parts, a compose file on top of the Dockerfile, and an nginx config to maintain.
- **Single image with nginx and the Go binary under a process supervisor**: one image, but two processes and a supervisor inside a container.

## Consequences

- The service's static-file handler must never shadow `/api/...` routes, and it must fall back to `index.html` only for non-API paths.
- In development, the Vite dev server proxies `/api` to the service, so the app always calls a relative `/api/v1/...` and never needs to know the service's address.
- CORS is opt-in, through `CORS_ALLOWED_ORIGINS` (empty by default). It exists only for running the service on its own behind another origin. Neither the dev setup nor the shipped image sets it.
