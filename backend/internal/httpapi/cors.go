package httpapi

import (
	"net/http"
	"strings"
)

// parseOrigins splits a comma-separated CORS_ALLOWED_ORIGINS value into its
// origins, ignoring spaces and empty entries.
func parseOrigins(list string) map[string]bool {
	origins := map[string]bool{}
	for origin := range strings.SplitSeq(list, ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			origins[origin] = true
		}
	}
	return origins
}

// cors lets the allowed origins call the service from another origin. An
// allowed preflight is answered here with 204; a disallowed one gets a bare
// 403. Every other request reaches next, with Access-Control-* headers only
// for an allowed origin. Every response says Vary: Origin, because each one
// depends on it. With no allowed origins it returns next unchanged.
func cors(allowed map[string]bool, next http.Handler) http.Handler {
	if len(allowed) == 0 {
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		isPreflight := r.Method == http.MethodOptions && origin != "" &&
			r.Header.Get("Access-Control-Request-Method") != ""
		h := w.Header()
		h.Add("Vary", "Origin")
		if !allowed[origin] {
			if isPreflight {
				w.WriteHeader(http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
			return
		}

		h.Set("Access-Control-Allow-Origin", origin)
		if isPreflight {
			h.Set("Access-Control-Allow-Methods", "GET, POST")
			h.Set("Access-Control-Allow-Headers", "Content-Type")
			h.Set("Access-Control-Max-Age", "600")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
