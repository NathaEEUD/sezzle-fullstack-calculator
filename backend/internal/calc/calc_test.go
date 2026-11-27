package calc_test

import (
	"errors"
	"math"
	"testing"

	"github.com/NathaEEUD/sezzle-fullstack-calculator/backend/internal/calc"
)

var negativeZero = math.Copysign(0, -1)

// TestEvaluateReturnsTheResultOfEachOperation checks the raw, unrounded
// float64 result, including -0 and huge finite values.
func TestEvaluateReturnsTheResultOfEachOperation(t *testing.T) {
	tests := []struct {
		name      string
		operation string
		operands  []float64
		want      float64
	}{
		{"add two positive operands", "add", []float64{2, 3}, 5},
		{"add a negative operand", "add", []float64{2, -5}, -3},
		{"add fractional operands", "add", []float64{0.5, 0.25}, 0.75},
		{"add huge operands", "add", []float64{1e307, 1e307}, 2e307},
		{"subtract a smaller right operand", "subtract", []float64{7, 3}, 4},
		{"subtract a larger right operand", "subtract", []float64{3, 7}, -4},
		{"subtract a negative operand", "subtract", []float64{3, -2}, 5},
		{"subtract equal operands gives zero", "subtract", []float64{0.5, 0.5}, 0},
		{"subtract huge operands", "subtract", []float64{-1e307, 1e307}, -2e307},
		{"multiply two positive operands", "multiply", []float64{3, 4}, 12},
		{"multiply by a negative operand", "multiply", []float64{3, -4}, -12},
		{"multiply fractional operands", "multiply", []float64{0.5, 0.5}, 0.25},
		{"multiply a negative operand by zero gives -0", "multiply", []float64{-3, 0}, negativeZero},
		{"multiply huge operands", "multiply", []float64{1e154, 1e154}, 1e308},
		{"divide evenly", "divide", []float64{12, 4}, 3},
		{"divide into a fraction", "divide", []float64{1, 4}, 0.25},
		{"divide by a negative operand", "divide", []float64{12, -4}, -3},
		{"divide zero by a negative operand gives -0", "divide", []float64{0, -4}, negativeZero},
		{"divide a tiny operand", "divide", []float64{1e-300, 1e10}, 1e-310},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := calc.Evaluate(tt.operation, tt.operands)
			if err != nil {
				t.Fatalf("Evaluate(%q, %v) error = %v", tt.operation, tt.operands, err)
			}
			if got != tt.want || math.Signbit(got) != math.Signbit(tt.want) {
				t.Errorf("Evaluate(%q, %v) = %v, want %v", tt.operation, tt.operands, got, tt.want)
			}
		})
	}
}

func TestEvaluateRejectsACalculationWithACalcError(t *testing.T) {
	tests := []struct {
		name        string
		operation   string
		operands    []float64
		wantCode    calc.Code
		wantErr     error
		wantMessage string
	}{
		{"unknown operation", "modulo", []float64{2, 3},
			calc.CodeUnknownOperation, calc.ErrUnknownOperation, `unknown operation "modulo"`},
		{"missing operation", "", []float64{2, 3},
			calc.CodeUnknownOperation, calc.ErrUnknownOperation, "operation is required"},
		{"wrong operand count", "add", []float64{2},
			calc.CodeInvalidOperandCount, calc.ErrInvalidOperandCount, "expected 2 operands for add, got 1"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := calc.Evaluate(tt.operation, tt.operands)

			var calcErr *calc.Error
			if !errors.As(err, &calcErr) {
				t.Fatalf("error = %v, want *calc.Error", err)
			}
			if calcErr.Code != tt.wantCode {
				t.Errorf("Code = %q, want %q", calcErr.Code, tt.wantCode)
			}
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("errors.Is(err, %v) = false", tt.wantCode)
			}
			if calcErr.Message != tt.wantMessage {
				t.Errorf("Message = %q, want %q", calcErr.Message, tt.wantMessage)
			}
		})
	}
}

func TestErrorTextIsItsMessage(t *testing.T) {
	_, err := calc.Evaluate("add", nil)
	if want := "expected 2 operands for add, got 0"; err.Error() != want {
		t.Errorf("Error() = %q, want %q", err.Error(), want)
	}
}

func TestOperationsListsTheRegistrySortedByName(t *testing.T) {
	want := []calc.Operation{
		{Name: "add", Arity: 2},
		{Name: "divide", Arity: 2},
		{Name: "multiply", Arity: 2},
		{Name: "subtract", Arity: 2},
	}

	got := calc.Operations()

	if len(got) != len(want) {
		t.Fatalf("Operations() = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("Operations()[%d] = %v, want %v", i, got[i], want[i])
		}
	}
}
