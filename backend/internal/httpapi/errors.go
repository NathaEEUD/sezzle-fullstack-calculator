package httpapi

import (
	"errors"
	"net/http"

	"github.com/NathaEEUD/sezzle-fullstack-calculator/backend/internal/calc"
)

const (
	codeInvalidJSON   = "INVALID_JSON"
	codeInternalError = "INTERNAL_ERROR"
)

// requestError is a bad request found before any calculation runs.
type requestError struct {
	code    string
	message string
}

func (e *requestError) Error() string { return e.message }

type envelope struct {
	Error envelopeError `json:"error"`
}

type envelopeError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// statusFor is the one mapping from an error to its status and envelope.
func statusFor(err error) (int, envelopeError) {
	var reqErr *requestError
	if errors.As(err, &reqErr) {
		return http.StatusBadRequest, envelopeError{Code: reqErr.code, Message: reqErr.message}
	}
	var calcErr *calc.Error
	if errors.As(err, &calcErr) {
		switch calcErr.Code {
		case calc.CodeUnknownOperation, calc.CodeInvalidOperandCount:
			return http.StatusBadRequest, envelopeError{Code: string(calcErr.Code), Message: calcErr.Message}
		}
	}
	return http.StatusInternalServerError, envelopeError{Code: codeInternalError, Message: "internal error"}
}

// writeError answers with the envelope for err. Go error text goes to the log,
// never to the response.
func (a *api) writeError(w http.ResponseWriter, r *http.Request, err error) {
	status, body := statusFor(err)
	if status >= http.StatusInternalServerError {
		a.logger.Error("request failed", "method", r.Method, "path", r.URL.Path, "error", err)
	}
	a.writeJSON(w, r, status, envelope{Error: body})
}
