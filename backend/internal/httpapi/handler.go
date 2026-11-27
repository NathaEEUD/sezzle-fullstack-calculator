// Package httpapi exposes the calculator over HTTP: routing, decoding and the
// error envelope. HTTP status codes appear only in this package.
package httpapi

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"
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
	service := http.NewServeMux()
	service.HandleFunc("POST /api/v1/calculate", api.calculate)
	service.HandleFunc("GET /api/v1/operations", api.operations)
	service.HandleFunc("GET /healthz", api.healthz)
	if cfg.staticDir == "" {
		return api.recoverPanics(api.route(service))
	}

	app := http.NewServeMux()
	app.Handle("GET /", staticHandler(cfg.staticDir))
	return api.recoverPanics(serviceOrApp(api.route(service), api.route(app)))
}

// recoverPanics turns a panic in next into a 500 envelope. The panic value
// and stack go to the log, never to the response.
func (a *api) recoverPanics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				a.writeError(w, r, fmt.Errorf("panic: %v\n%s", v, debug.Stack()))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// serviceOrApp sends /api/... and /healthz to the service and every other
// path to the app, so the app never shadows the API.
func serviceOrApp(service, app http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := r.URL.Path
		if p == "/api" || strings.HasPrefix(p, "/api/") || p == "/healthz" {
			service.ServeHTTP(w, r)
			return
		}
		app.ServeHTTP(w, r)
	})
}

// route serves r from mux, and answers a path or method that no pattern
// matches with an error envelope instead of the mux's plain-text reply.
func (a *api) route(mux *http.ServeMux) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fallback, pattern := mux.Handler(r)
		if pattern != "" {
			mux.ServeHTTP(w, r)
			return
		}
		// The mux's own fallback knows whether this is a 404 or a 405 and
		// which methods are allowed; keep that and drop its body.
		miss := &missRecorder{header: http.Header{}}
		fallback.ServeHTTP(miss, r)
		if miss.status == http.StatusMethodNotAllowed {
			allow := miss.header.Get("Allow")
			w.Header().Set("Allow", allow)
			a.writeError(w, r, methodNotAllowed(r, allow))
			return
		}
		a.writeError(w, r, notFound(r))
	})
}

// missRecorder captures the status and headers of the mux's fallback reply.
type missRecorder struct {
	header http.Header
	status int
}

func (m *missRecorder) Header() http.Header         { return m.header }
func (m *missRecorder) WriteHeader(status int)      { m.status = status }
func (m *missRecorder) Write(b []byte) (int, error) { return len(b), nil }

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
