// Package calc evaluates calculations: one operation applied to its operands.
// It is pure maths and knows nothing about HTTP.
package calc

import "fmt"

type operation struct {
	arity int
	apply func(operands []float64) float64
}

// registry holds every operation the service can evaluate. Adding an
// operation is one entry here and one table-test row.
var registry = map[string]operation{
	"add":      {arity: 2, apply: func(o []float64) float64 { return o[0] + o[1] }},
	"subtract": {arity: 2, apply: func(o []float64) float64 { return o[0] - o[1] }},
	"multiply": {arity: 2, apply: func(o []float64) float64 { return o[0] * o[1] }},
	"divide":   {arity: 2, apply: func(o []float64) float64 { return o[0] / o[1] }},
}

// Evaluate applies the named operation to its operands and returns the raw
// result, or a *Error.
func Evaluate(name string, operands []float64) (float64, error) {
	operation, ok := registry[name]
	if !ok {
		return 0, &Error{Code: CodeUnknownOperation, Message: fmt.Sprintf("unknown operation %q", name)}
	}
	if len(operands) != operation.arity {
		return 0, &Error{
			Code:    CodeInvalidOperandCount,
			Message: fmt.Sprintf("expected %d operands for %s, got %d", operation.arity, name, len(operands)),
		}
	}
	return operation.apply(operands), nil
}
