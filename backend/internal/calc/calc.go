// Package calc evaluates calculations: one operation applied to its operands.
// It is pure maths and knows nothing about HTTP.
package calc

import (
	"fmt"
	"maps"
	"math"
	"slices"
)

// Operation names an operation the service can evaluate, with its arity.
type Operation struct {
	Name  string
	Arity int
}

type entry struct {
	arity int
	apply func(operands []float64) (float64, error)
}

// alwaysReal wraps an operation that always has a real result.
func alwaysReal(f func(o []float64) float64) func([]float64) (float64, error) {
	return func(o []float64) (float64, error) { return f(o), nil }
}

// registry holds every operation the service can evaluate. Adding an
// operation is one entry here and one table-test row.
var registry = map[string]entry{
	"add":      {arity: 2, apply: alwaysReal(func(o []float64) float64 { return o[0] + o[1] })},
	"subtract": {arity: 2, apply: alwaysReal(func(o []float64) float64 { return o[0] - o[1] })},
	"multiply": {arity: 2, apply: alwaysReal(func(o []float64) float64 { return o[0] * o[1] })},
	"divide":   {arity: 2, apply: divide},
	// percent is "x percent of base"; the app picks the base (ADR-0003).
	"percent": {arity: 2, apply: alwaysReal(func(o []float64) float64 { return o[0] * o[1] / 100 })},
}

func divide(o []float64) (float64, error) {
	if o[1] == 0 {
		return 0, &Error{Code: CodeDivisionByZero, Message: "Cannot divide by zero"}
	}
	return o[0] / o[1], nil
}

// Evaluate applies the named operation to its operands and returns the raw
// result, or a *Error. Every result passes one finiteness check, so a caller
// never sees ±Inf.
func Evaluate(name string, operands []float64) (float64, error) {
	if name == "" {
		return 0, &Error{Code: CodeUnknownOperation, Message: "operation is required"}
	}
	found, ok := registry[name]
	if !ok {
		return 0, &Error{Code: CodeUnknownOperation, Message: fmt.Sprintf("unknown operation %q", name)}
	}
	if len(operands) != found.arity {
		return 0, &Error{
			Code:    CodeInvalidOperandCount,
			Message: fmt.Sprintf("expected %d operands for %s, got %d", found.arity, name, len(operands)),
		}
	}
	result, err := found.apply(operands)
	if err != nil {
		return 0, err
	}
	if math.IsInf(result, 0) {
		return 0, &Error{Code: CodeOverflow, Message: "Result too large"}
	}
	return result, nil
}

// Operations lists every operation in the registry, sorted by name.
func Operations() []Operation {
	names := slices.Sorted(maps.Keys(registry))
	operations := make([]Operation, len(names))
	for i, name := range names {
		operations[i] = Operation{Name: name, Arity: registry[name].arity}
	}
	return operations
}
