// Package httpapi exposes the calculator over HTTP: routing, decoding and the
// error envelope. HTTP status codes appear only in this package.
package httpapi

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
)

type config struct {
	staticDir string
}

// Option configures NewHandler.
type Option func(*config)

// WithStaticDir serves the built app from dir for every non-API path.
// An empty dir serves nothing, so callers can pass STATIC_DIR as it is.
func WithStaticDir(dir string) Option {
	return func(c *config) { c.staticDir = dir }
}

// NewHandler builds every route and middleware of the service.
func NewHandler(logger *slog.Logger, opts ...Option) http.Handler {
	var cfg config
	for _, opt := range opts {
		opt(&cfg)
	}

	api := &api{logger: logger}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/calculate", api.calculate)
	mux.HandleFunc("GET /healthz", api.healthz)
	if cfg.staticDir != "" {
		mux.Handle("GET /", staticHandler(cfg.staticDir))
	}
	return mux
}

type api struct {
	logger *slog.Logger
}

func (a *api) healthz(w http.ResponseWriter, r *http.Request) {
	a.writeJSON(w, r, http.StatusOK, map[string]string{"status": "ok"})
}

// writeJSON encodes body before writing any header, so a body that can't be
// encoded becomes a 500 envelope instead of an empty 200.
func (a *api) writeJSON(w http.ResponseWriter, r *http.Request, status int, body any) {
	data, err := json.Marshal(body)
	if err != nil {
		a.writeError(w, r, fmt.Errorf("encode response: %w", err))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(append(data, '\n'))
}
