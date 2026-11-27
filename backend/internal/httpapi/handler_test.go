package httpapi_test

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/NathaEEUD/sezzle-fullstack-calculator/backend/internal/calc"
	"github.com/NathaEEUD/sezzle-fullstack-calculator/backend/internal/httpapi"
)

func newHandler(t *testing.T, opts ...httpapi.Option) http.Handler {
	t.Helper()
	h, _ := newHandlerWithLogs(t, opts...)
	return h
}

// newHandlerWithLogs builds the real handler with its logger writing JSON
// lines to the returned buffer.
func newHandlerWithLogs(t *testing.T, opts ...httpapi.Option) (http.Handler, *bytes.Buffer) {
	t.Helper()
	var logs bytes.Buffer
	return httpapi.NewHandler(slog.New(slog.NewJSONHandler(&logs, nil)), opts...), &logs
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

func TestOperationsListsEveryOperationInTheRegistrySortedByName(t *testing.T) {
	rec := do(t, newHandler(t), http.MethodGet, "/api/v1/operations", "")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
	var body struct {
		Operations []struct {
			Name  string `json:"name"`
			Arity int    `json:"arity"`
		} `json:"operations"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("body = %s, want the operations list: %v", rec.Body.String(), err)
	}

	registry := calc.Operations()
	if len(body.Operations) != len(registry) {
		t.Fatalf("operations = %+v, want %+v", body.Operations, registry)
	}
	for i, operation := range body.Operations {
		if operation.Name != registry[i].Name || operation.Arity != registry[i].Arity {
			t.Errorf("operations[%d] = %+v, want %+v", i, operation, registry[i])
		}
		if i > 0 && body.Operations[i-1].Name >= operation.Name {
			t.Errorf("operations[%d] %q is not after %q, want sorted by name", i, operation.Name, body.Operations[i-1].Name)
		}
	}
}

func TestCalculateAnswersEveryBadRequestWithItsCode(t *testing.T) {
	valid := `{"operation":"add","operands":[2,3]}`
	padding := strings.Repeat(" ", 1024)
	tests := []struct {
		name, body, code, message string
	}{
		{"malformed JSON", `{"operation":`, "INVALID_JSON", "request body is not valid JSON"},
		{"empty body", "", "INVALID_JSON", "request body is empty"},
		{"unknown field", `{"operation":"add","operands":[2,3],"precision":2}`,
			"INVALID_JSON", `unknown field "precision"`},
		{"trailing data", valid + ` {}`, "INVALID_JSON", "request body has data after the JSON object"},
		{"trailing garbage", valid + `}`, "INVALID_JSON", "request body has data after the JSON object"},
		{"body over 1024 bytes", padding + valid, "INVALID_JSON", "request body is over 1024 bytes"},
		{"body over 1024 bytes after the JSON object", valid + padding,
			"INVALID_JSON", "request body is over 1024 bytes"},
		{"string operand", `{"operation":"add","operands":["2",3]}`,
			"INVALID_JSON", "operands must be numbers, got string"},
		{"null operand", `{"operation":"add","operands":[null,3]}`,
			"INVALID_JSON", "operands must be numbers, got null"},
		{"operand beyond float64", `{"operation":"add","operands":[1e400,3]}`,
			"INVALID_JSON", "operand 1e400 is out of range"},
		{"operands not an array", `{"operation":"add","operands":5}`,
			"INVALID_JSON", "operands must be an array of numbers, got number"},
		{"operation not a string", `{"operation":5,"operands":[2,3]}`,
			"INVALID_JSON", "operation must be a string, got number"},
		{"body not an object", `[2,3]`, "INVALID_JSON", "request body must be a JSON object"},
		{"missing operation", `{"operands":[2,3]}`, "UNKNOWN_OPERATION", "operation is required"},
		{"empty operation", `{"operation":"","operands":[2,3]}`, "UNKNOWN_OPERATION", "operation is required"},
		{"operation not in the registry", `{"operation":"modulo","operands":[2,3]}`,
			"UNKNOWN_OPERATION", `unknown operation "modulo"`},
		{"missing operands", `{"operation":"add"}`,
			"INVALID_OPERAND_COUNT", "expected 2 operands for add, got 0"},
		{"too few operands", `{"operation":"add","operands":[2]}`,
			"INVALID_OPERAND_COUNT", "expected 2 operands for add, got 1"},
		{"too many operands", `{"operation":"add","operands":[2,3,4]}`,
			"INVALID_OPERAND_COUNT", "expected 2 operands for add, got 3"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(t, newHandler(t), http.MethodPost, "/api/v1/calculate", tt.body)

			want, _ := json.Marshal(map[string]map[string]string{"error": {"code": tt.code, "message": tt.message}})
			assertResponse(t, rec, http.StatusBadRequest, string(want))
		})
	}
}

func TestCalculateAcceptsABodyOfExactly1024Bytes(t *testing.T) {
	valid := `{"operation":"add","operands":[2,3]}`
	body := valid + strings.Repeat(" ", 1024-len(valid))

	rec := do(t, newHandler(t), http.MethodPost, "/api/v1/calculate", body)

	assertResponse(t, rec, http.StatusOK, `{"operation":"add","operands":[2,3],"result":5}`)
}

func TestAnUnknownPathIsNotFound(t *testing.T) {
	tests := []struct {
		name, method, path string
		opts               []httpapi.Option
	}{
		{"an unknown API path", http.MethodGet, "/api/v1/unknown", nil},
		{"an unversioned API path", http.MethodPost, "/api/calculate", nil},
		{"a future API version", http.MethodPost, "/api/v2/calculate", nil},
		{"any path without a static dir", http.MethodGet, "/", nil},
		{"an unknown API path with a static dir", http.MethodGet, "/api/v1/unknown",
			[]httpapi.Option{httpapi.WithStaticDir(staticDir(t))}},
		{"an unknown API path posted to with a static dir", http.MethodPost, "/api/v1/unknown",
			[]httpapi.Option{httpapi.WithStaticDir(staticDir(t))}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(t, newHandler(t, tt.opts...), tt.method, tt.path, "")

			assertResponse(t, rec, http.StatusNotFound,
				`{"error":{"code":"NOT_FOUND","message":"no route for `+tt.method+` `+tt.path+`"}}`)
			if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
				t.Errorf("Content-Type = %q, want application/json", ct)
			}
		})
	}
}

func TestAWrongMethodIsNotAllowedAndNamesTheAllowedOnes(t *testing.T) {
	tests := []struct {
		name, method, path, allow string
		opts                      []httpapi.Option
	}{
		{"calculate is POST only", http.MethodGet, "/api/v1/calculate", "POST", nil},
		{"operations is GET only", http.MethodPost, "/api/v1/operations", "GET, HEAD", nil},
		{"healthz is GET only", http.MethodDelete, "/healthz", "GET, HEAD", nil},
		{"calculate is POST only with a static dir", http.MethodGet, "/api/v1/calculate", "POST",
			[]httpapi.Option{httpapi.WithStaticDir(staticDir(t))}},
		{"the app is GET only", http.MethodPost, "/some/route", "GET, HEAD",
			[]httpapi.Option{httpapi.WithStaticDir(staticDir(t))}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(t, newHandler(t, tt.opts...), tt.method, tt.path, "")

			assertResponse(t, rec, http.StatusMethodNotAllowed,
				`{"error":{"code":"METHOD_NOT_ALLOWED","message":"method `+tt.method+` is not allowed on `+
					tt.path+`; allowed: `+tt.allow+`"}}`)
			if got := rec.Header().Get("Allow"); got != tt.allow {
				t.Errorf("Allow = %q, want %q", got, tt.allow)
			}
		})
	}
}

// panickingBody panics with its value the first time a handler reads the
// request body.
type panickingBody struct{ value any }

func (b panickingBody) Read([]byte) (int, error) { panic(b.value) }

// errorLog returns the first ERROR entry among the JSON log lines.
func errorLog(t *testing.T, logs *bytes.Buffer) map[string]any {
	t.Helper()
	for line := range strings.Lines(logs.String()) {
		var entry map[string]any
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			t.Fatalf("log line = %q, want JSON: %v", line, err)
		}
		if entry["level"] == "ERROR" {
			return entry
		}
	}
	t.Fatalf("logs = %q, want an ERROR entry", logs.String())
	return nil
}

func TestAPanicInAHandlerIsAnInternalErrorAndIsLogged(t *testing.T) {
	h, logs := newHandlerWithLogs(t)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/calculate", panickingBody{"body reader exploded"}))

	assertResponse(t, rec, http.StatusInternalServerError,
		`{"error":{"code":"INTERNAL_ERROR","message":"internal error"}}`)
	if strings.Contains(rec.Body.String(), "exploded") {
		t.Errorf("body = %s, want no panic text", rec.Body.String())
	}

	entry := errorLog(t, logs)
	if entry["path"] != "/api/v1/calculate" || entry["method"] != "POST" {
		t.Errorf("log entry = %v, want an ERROR for POST /api/v1/calculate", entry)
	}
	if msg, _ := entry["error"].(string); !strings.Contains(msg, "body reader exploded") {
		t.Errorf("log error = %q, want the panic value", msg)
	}
}

func TestAnAbortedHandlerIsNotRecovered(t *testing.T) {
	h := newHandler(t)
	defer func() {
		if v := recover(); v != http.ErrAbortHandler {
			t.Errorf("recovered %v, want http.ErrAbortHandler to reach the server", v)
		}
	}()

	h.ServeHTTP(httptest.NewRecorder(),
		httptest.NewRequest(http.MethodPost, "/api/v1/calculate", panickingBody{http.ErrAbortHandler}))
}

// requestLogs returns the per-request entries among the JSON log lines.
func requestLogs(t *testing.T, logs *bytes.Buffer) []map[string]any {
	t.Helper()
	var entries []map[string]any
	for line := range strings.Lines(logs.String()) {
		var entry map[string]any
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			t.Fatalf("log line = %q, want JSON: %v", line, err)
		}
		if entry["msg"] == "request" {
			entries = append(entries, entry)
		}
	}
	return entries
}

func TestEachRequestLogsOneLineWithMethodPathStatusAndDuration(t *testing.T) {
	tests := []struct {
		name, method, path, body string
		status                   int
	}{
		{"a calculation", http.MethodPost, "/api/v1/calculate", `{"operation":"add","operands":[2,3]}`, http.StatusOK},
		{"a bad request", http.MethodPost, "/api/v1/calculate", `{"operation":"modulo","operands":[2,3]}`,
			http.StatusBadRequest},
		{"an unknown path", http.MethodGet, "/api/v1/unknown", "", http.StatusNotFound},
		{"a panic", http.MethodPost, "/api/v1/calculate", "", http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, logs := newHandlerWithLogs(t)
			var body io.Reader = strings.NewReader(tt.body)
			if tt.status == http.StatusInternalServerError {
				body = panickingBody{"boom"}
			}
			h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(tt.method, tt.path, body))

			entries := requestLogs(t, logs)
			if len(entries) != 1 {
				t.Fatalf("request log lines = %v, want exactly one", entries)
			}
			entry := entries[0]
			if entry["level"] != "INFO" || entry["method"] != tt.method || entry["path"] != tt.path ||
				entry["status"] != float64(tt.status) {
				t.Errorf("request log = %v, want INFO %s %s %d", entry, tt.method, tt.path, tt.status)
			}
			if d, ok := entry["duration"].(float64); !ok || d < 0 {
				t.Errorf("request log duration = %v, want a non-negative duration", entry["duration"])
			}
		})
	}
}

// corsHeaders are every header the CORS middleware may set.
var corsHeaders = []string{
	"Access-Control-Allow-Origin",
	"Access-Control-Allow-Methods",
	"Access-Control-Allow-Headers",
	"Access-Control-Max-Age",
	"Vary",
}

func preflight(t *testing.T, h http.Handler, origin string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/calculate", nil)
	req.Header.Set("Origin", origin)
	req.Header.Set("Access-Control-Request-Method", http.MethodPost)
	req.Header.Set("Access-Control-Request-Headers", "content-type")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func calculateFrom(t *testing.T, h http.Handler, origin string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(`{"operation":"add","operands":[2,3]}`))
	req.Header.Set("Origin", origin)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func assertNoCORSHeaders(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	for _, name := range corsHeaders {
		if got := rec.Header().Get(name); got != "" {
			t.Errorf("%s = %q, want no CORS headers", name, got)
		}
	}
}

const allowedOrigin = "https://app.example.com"

func corsHandler(t *testing.T) http.Handler {
	t.Helper()
	return newHandler(t, httpapi.WithCORSAllowedOrigins("https://other.example.com, "+allowedOrigin))
}

func TestAnAllowedPreflightGets204WithTheCORSHeaders(t *testing.T) {
	rec := preflight(t, corsHandler(t), allowedOrigin)

	if rec.Code != http.StatusNoContent {
		t.Errorf("status = %d, want 204", rec.Code)
	}
	if rec.Body.Len() != 0 {
		t.Errorf("body = %q, want empty", rec.Body.String())
	}
	want := map[string]string{
		"Access-Control-Allow-Origin":  allowedOrigin,
		"Access-Control-Allow-Methods": "GET, POST",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Max-Age":       "600",
		"Vary":                         "Origin",
	}
	for name, value := range want {
		if got := rec.Header().Get(name); got != value {
			t.Errorf("%s = %q, want %q", name, got, value)
		}
	}
}

func TestADisallowedPreflightGetsABare403(t *testing.T) {
	rec := preflight(t, corsHandler(t), "https://evil.example.com")

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", rec.Code)
	}
	if rec.Body.Len() != 0 {
		t.Errorf("body = %q, want a bare 403", rec.Body.String())
	}
	assertNoCORSHeaders(t, rec)
}

func TestADisallowedSimpleRequestIsServedWithoutCORSHeaders(t *testing.T) {
	rec := calculateFrom(t, corsHandler(t), "https://evil.example.com")

	assertResponse(t, rec, http.StatusOK, `{"operation":"add","operands":[2,3],"result":5}`)
	assertNoCORSHeaders(t, rec)
}

func TestAnAllowedSimpleRequestEchoesItsOrigin(t *testing.T) {
	rec := calculateFrom(t, corsHandler(t), allowedOrigin)

	assertResponse(t, rec, http.StatusOK, `{"operation":"add","operands":[2,3],"result":5}`)
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != allowedOrigin {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, allowedOrigin)
	}
	if got := rec.Header().Get("Vary"); got != "Origin" {
		t.Errorf("Vary = %q, want Origin", got)
	}
}

func TestCORSIsOffByDefault(t *testing.T) {
	for _, list := range []string{"", " , "} {
		t.Run("CORS_ALLOWED_ORIGINS="+strconv.Quote(list), func(t *testing.T) {
			h := newHandler(t, httpapi.WithCORSAllowedOrigins(list))

			t.Run("a preflight is not answered", func(t *testing.T) {
				rec := preflight(t, h, allowedOrigin)
				if rec.Code != http.StatusMethodNotAllowed {
					t.Errorf("status = %d, want 405", rec.Code)
				}
				assertNoCORSHeaders(t, rec)
			})
			t.Run("a request from another origin gets no CORS headers", func(t *testing.T) {
				rec := calculateFrom(t, h, allowedOrigin)
				assertResponse(t, rec, http.StatusOK, `{"operation":"add","operands":[2,3],"result":5}`)
				assertNoCORSHeaders(t, rec)
			})
		})
	}
}
