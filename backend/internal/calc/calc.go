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
	"add": {arity: 2, apply: func(o []float64) float64 { return o[0] + o[1] }},
}

// Evaluate applies the named operation to its operands and returns the raw
// result, or a *Error.
func Evaluate(name string, operands []float64) (float64, error) {
	op, ok := registry[name]
	if !ok {
		return 0, &Error{Code: CodeUnknownOperation, Message: fmt.Sprintf("unknown operation %q", name)}
	}
	if len(operands) != op.arity {
		return 0, &Error{
			Code:    CodeInvalidOperandCount,
			Message: fmt.Sprintf("expected %d operands for %s, got %d", op.arity, name, len(operands)),
		}
	}
	return op.apply(operands), nil
}
