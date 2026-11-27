package httpapi

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/NathaEEUD/sezzle-fullstack-calculator/backend/internal/calc"
)

const (
	codeInvalidJSON      = "INVALID_JSON"
	codeNotFound         = "NOT_FOUND"
	codeMethodNotAllowed = "METHOD_NOT_ALLOWED"
	codeInternalError    = "INTERNAL_ERROR"
)

// requestError is a request the service refuses before any calculation
// runs: a bad request body, an unknown path or a wrong method.
type requestError struct {
	code    string
	message string
}

func (e *requestError) Error() string { return e.message }

func invalidJSON(message string) error {
	return &requestError{code: codeInvalidJSON, message: message}
}

func notFound(r *http.Request) error {
	return &requestError{
		code:    codeNotFound,
		message: fmt.Sprintf("no route for %s %s", r.Method, r.URL.Path),
	}
}

func methodNotAllowed(r *http.Request, allow string) error {
	return &requestError{
		code:    codeMethodNotAllowed,
		message: fmt.Sprintf("method %s is not allowed on %s; allowed: %s", r.Method, r.URL.Path, allow),
	}
}

type envelope struct {
	Error envelopeError `json:"error"`
}

type envelopeError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// requestStatus is the status of each requestError code.
var requestStatus = map[string]int{
	codeInvalidJSON:      http.StatusBadRequest,
	codeNotFound:         http.StatusNotFound,
	codeMethodNotAllowed: http.StatusMethodNotAllowed,
}

// statusFor is the one mapping from an error to its status and envelope.
func statusFor(err error) (int, envelopeError) {
	var reqErr *requestError
	if errors.As(err, &reqErr) {
		return requestStatus[reqErr.code], envelopeError{Code: reqErr.code, Message: reqErr.message}
	}
	var calcErr *calc.Error
	if errors.As(err, &calcErr) {
		switch calcErr.Code {
		case calc.CodeUnknownOperation, calc.CodeInvalidOperandCount:
			return http.StatusBadRequest, envelopeError{Code: string(calcErr.Code), Message: calcErr.Message}
		case calc.CodeDivisionByZero, calc.CodeOverflow:
			return http.StatusUnprocessableEntity, envelopeError{Code: string(calcErr.Code), Message: calcErr.Message}
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
