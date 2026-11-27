package httpapi_test

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/NathaEEUD/sezzle-fullstack-calculator/backend/internal/httpapi"
)

func newHandler(t *testing.T, opts ...httpapi.Option) http.Handler {
	t.Helper()
	var logs bytes.Buffer
	return httpapi.NewHandler(slog.New(slog.NewJSONHandler(&logs, nil)), opts...)
}

func do(t *testing.T, h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	var r io.Reader
	if body != "" {
		r = strings.NewReader(body)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(method, path, r))
	return rec
}

func assertResponse(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantBody string) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Errorf("status = %d, want %d", rec.Code, wantStatus)
	}
	if got := strings.TrimSpace(rec.Body.String()); got != wantBody {
		t.Errorf("body = %s, want %s", got, wantBody)
	}
}

func TestCalculateEchoesTheCalculationWithItsResult(t *testing.T) {
	rec := do(t, newHandler(t), http.MethodPost, "/api/v1/calculate", `{"operation":"add","operands":[2,3]}`)

	assertResponse(t, rec, http.StatusOK, `{"operation":"add","operands":[2,3],"result":5}`)
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
}

func TestCalculateAnswersMalformedJSONWithAnErrorEnvelope(t *testing.T) {
	rec := do(t, newHandler(t), http.MethodPost, "/api/v1/calculate", `{"operation":`)

	assertResponse(t, rec, http.StatusBadRequest,
		`{"error":{"code":"INVALID_JSON","message":"request body is not valid JSON"}}`)
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
}

func TestCalculateAnswersARejectedCalculationWithABadRequest(t *testing.T) {
	tests := []struct {
		name, body, want string
	}{
		{"unknown operation", `{"operation":"modulo","operands":[2,3]}`,
			`{"error":{"code":"UNKNOWN_OPERATION","message":"unknown operation \"modulo\""}}`},
		{"wrong operand count", `{"operation":"add","operands":[2]}`,
			`{"error":{"code":"INVALID_OPERAND_COUNT","message":"expected 2 operands for add, got 1"}}`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(t, newHandler(t), http.MethodPost, "/api/v1/calculate", tt.body)
			assertResponse(t, rec, http.StatusBadRequest, tt.want)
		})
	}
}

func TestCalculateNeverAnswersAnEmpty200WhenTheResultCannotBeEncoded(t *testing.T) {
	rec := do(t, newHandler(t), http.MethodPost, "/api/v1/calculate", `{"operation":"add","operands":[1e308,1e308]}`)

	assertResponse(t, rec, http.StatusInternalServerError,
		`{"error":{"code":"INTERNAL_ERROR","message":"internal error"}}`)
}

func TestHealthzReportsOK(t *testing.T) {
	rec := do(t, newHandler(t), http.MethodGet, "/healthz", "")

	assertResponse(t, rec, http.StatusOK, `{"status":"ok"}`)
}

func staticDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	write := func(name, content string) {
		path := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("index.html", "<!doctype html><title>Calculator</title>")
	write("assets/app.js", "console.log('app')")
	return dir
}

func TestStaticDirServesTheBuiltApp(t *testing.T) {
	h := newHandler(t, httpapi.WithStaticDir(staticDir(t)))

	tests := []struct {
		name, path, want string
	}{
		{"root serves index.html", "/", "<!doctype html><title>Calculator</title>"},
		{"an asset is served as is", "/assets/app.js", "console.log('app')"},
		{"an unknown path falls back to index.html", "/some/route", "<!doctype html><title>Calculator</title>"},
		{"a directory falls back to index.html", "/assets/", "<!doctype html><title>Calculator</title>"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assertResponse(t, do(t, h, http.MethodGet, tt.path, ""), http.StatusOK, tt.want)
		})
	}
}

func TestStaticDirNeverShadowsTheAPI(t *testing.T) {
	h := newHandler(t, httpapi.WithStaticDir(staticDir(t)))

	t.Run("calculate still answers", func(t *testing.T) {
		rec := do(t, h, http.MethodPost, "/api/v1/calculate", `{"operation":"add","operands":[2,3]}`)
		assertResponse(t, rec, http.StatusOK, `{"operation":"add","operands":[2,3],"result":5}`)
	})
	t.Run("healthz still answers", func(t *testing.T) {
		assertResponse(t, do(t, h, http.MethodGet, "/healthz", ""), http.StatusOK, `{"status":"ok"}`)
	})
	t.Run("an unknown API path is not index.html", func(t *testing.T) {
		rec := do(t, h, http.MethodGet, "/api/v1/unknown", "")
		if rec.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", rec.Code)
		}
		if strings.Contains(rec.Body.String(), "<!doctype html>") {
			t.Errorf("body = %s, want no index.html", rec.Body.String())
		}
	})
}

func TestWithoutStaticDirNoAppIsServed(t *testing.T) {
	rec := do(t, newHandler(t), http.MethodGet, "/", "")

	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
}
