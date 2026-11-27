package httpapi

import (
	"fmt"
	"net/http"
	"runtime/debug"
	"strings"
	"time"
)

// recoverPanics turns a panic in next into a 500 envelope. The panic value
// and stack go to the log, never to the response.
func (a *api) recoverPanics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			v := recover()
			if v == nil {
				return
			}
			if v == http.ErrAbortHandler {
				panic(v) // the server aborts the response on purpose
			}
			a.writeError(w, r, fmt.Errorf("panic: %v\n%s", v, debug.Stack()))
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

// logRequests writes one INFO line per request with its method, path, status
// and duration.
func (a *api) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		a.logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration", time.Since(start),
		)
	})
}

// statusRecorder remembers the status written through it. A handler that
// writes a body without a status has answered 200.
type statusRecorder struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (s *statusRecorder) WriteHeader(status int) {
	if !s.wroteHeader {
		s.status, s.wroteHeader = status, true
	}
	s.ResponseWriter.WriteHeader(status)
}

func (s *statusRecorder) Write(b []byte) (int, error) {
	s.wroteHeader = true
	return s.ResponseWriter.Write(b)
}

// Unwrap lets http.ResponseController reach the server's writer.
func (s *statusRecorder) Unwrap() http.ResponseWriter { return s.ResponseWriter }
