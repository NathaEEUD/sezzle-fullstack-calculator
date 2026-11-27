# One image serves the app and the API from one origin (ADR-0001).
# Build: make docker. Run: docker run --rm -p 8080:8080 calculator

# The app: Vite builds frontend/ into static files.
FROM node:22-alpine AS web
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# The service: a static binary, standard library only.
FROM golang:1.27-alpine AS service
WORKDIR /src/backend
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -o /out/calculator ./cmd/calculator

# The runtime: no shell, no package manager, the distroless nonroot user.
FROM gcr.io/distroless/static:nonroot
COPY --from=service /out/calculator /app/calculator
COPY --from=web /src/frontend/dist /app/web
ENV STATIC_DIR=/app/web
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/calculator"]
