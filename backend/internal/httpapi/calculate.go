package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"reflect"
	"strings"

	"github.com/NathaEEUD/sezzle-fullstack-calculator/backend/internal/calc"
)

// maxBodyBytes caps a calculation request body.
const maxBodyBytes = 1024

// calculationRequest decodes operands as pointers so a null operand is
// rejected instead of becoming 0.
type calculationRequest struct {
	Operation string     `json:"operation"`
	Operands  []*float64 `json:"operands"`
}

type calculationResponse struct {
	Operation string    `json:"operation"`
	Operands  []float64 `json:"operands"`
	Result    float64   `json:"result"`
}

func (a *api) calculate(w http.ResponseWriter, r *http.Request) {
	operation, operands, err := decodeCalculation(w, r)
	if err != nil {
		a.writeError(w, r, err)
		return
	}

	result, err := calc.Evaluate(operation, operands)
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	a.writeJSON(w, r, http.StatusOK, calculationResponse{Operation: operation, Operands: operands, Result: result})
}

// decodeCalculation reads exactly one JSON object of at most maxBodyBytes,
// with no unknown fields and no null operands.
func decodeCalculation(w http.ResponseWriter, r *http.Request) (string, []float64, error) {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()

	var req calculationRequest
	if err := dec.Decode(&req); err != nil {
		return "", nil, decodeError(err)
	}
	if err := dec.Decode(&json.RawMessage{}); !errors.Is(err, io.EOF) {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			return "", nil, decodeError(err)
		}
		return "", nil, invalidJSON("request body has data after the JSON object")
	}

	operands := make([]float64, len(req.Operands))
	for i, operand := range req.Operands {
		if operand == nil {
			return "", nil, invalidJSON("operands must be numbers, got null")
		}
		operands[i] = *operand
	}
	return req.Operation, operands, nil
}

// decodeError names the specific cause of a decoding failure. Its message is
// written here, never copied from Go's error text.
func decodeError(err error) error {
	var tooLarge *http.MaxBytesError
	var wrongType *json.UnmarshalTypeError
	switch {
	case errors.As(err, &tooLarge):
		return invalidJSON(fmt.Sprintf("request body is over %d bytes", maxBodyBytes))
	case errors.Is(err, io.EOF):
		return invalidJSON("request body is empty")
	case errors.As(err, &wrongType):
		return typeError(wrongType)
	case strings.HasPrefix(err.Error(), "json: unknown field "):
		name := strings.TrimPrefix(err.Error(), "json: unknown field ")
		return invalidJSON("unknown field " + name)
	default:
		return invalidJSON("request body is not valid JSON")
	}
}

func typeError(err *json.UnmarshalTypeError) error {
	if literal, ok := strings.CutPrefix(err.Value, "number "); ok {
		return invalidJSON(fmt.Sprintf("operand %s is out of range", literal))
	}
	switch {
	case err.Field == "operands" && err.Type.Kind() == reflect.Slice:
		return invalidJSON("operands must be an array of numbers, got " + err.Value)
	case strings.HasPrefix(err.Field, "operands"):
		return invalidJSON("operands must be numbers, got " + err.Value)
	case err.Field == "operation":
		return invalidJSON("operation must be a string, got " + err.Value)
	default:
		return invalidJSON("request body must be a JSON object")
	}
}
