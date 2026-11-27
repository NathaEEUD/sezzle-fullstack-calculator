package httpapi

import (
	"io/fs"
	"net/http"
	"os"
	"path"
	"strings"
)

// staticHandler serves the built app from dir. Any path that isn't a file
// falls back to index.html so the app can route. NewHandler never sends it
// /api/... or /healthz.
func staticHandler(dir string) http.Handler {
	fsys := os.DirFS(dir)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if info, err := fs.Stat(fsys, name); err != nil || info.IsDir() {
			name = "index.html"
		}
		http.ServeFileFS(w, r, fsys, name)
	})
}
