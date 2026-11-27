package calc_test

import (
	"errors"
	"testing"

	"github.com/NathaEEUD/sezzle-fullstack-calculator/backend/internal/calc"
)

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
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := calc.Evaluate(tt.operation, tt.operands)
			if err != nil {
				t.Fatalf("Evaluate(%q, %v) error = %v", tt.operation, tt.operands, err)
			}
			if got != tt.want {
				t.Errorf("Evaluate(%q, %v) = %v, want %v", tt.operation, tt.operands, got, tt.want)
			}
		})
	}
}

func TestEvaluateRejectsAnUnknownOperation(t *testing.T) {
	_, err := calc.Evaluate("modulo", []float64{2, 3})

	var calcErr *calc.Error
	if !errors.As(err, &calcErr) {
		t.Fatalf("error = %v, want *calc.Error", err)
	}
	if calcErr.Code != calc.CodeUnknownOperation {
		t.Errorf("Code = %q, want %q", calcErr.Code, calc.CodeUnknownOperation)
	}
	if !errors.Is(err, calc.ErrUnknownOperation) {
		t.Errorf("errors.Is(err, ErrUnknownOperation) = false")
	}
	if want := `unknown operation "modulo"`; calcErr.Message != want {
		t.Errorf("Message = %q, want %q", calcErr.Message, want)
	}
}

func TestEvaluateRejectsTheWrongOperandCount(t *testing.T) {
	_, err := calc.Evaluate("add", []float64{2})

	var calcErr *calc.Error
	if !errors.As(err, &calcErr) {
		t.Fatalf("error = %v, want *calc.Error", err)
	}
	if calcErr.Code != calc.CodeInvalidOperandCount {
		t.Errorf("Code = %q, want %q", calcErr.Code, calc.CodeInvalidOperandCount)
	}
	if !errors.Is(err, calc.ErrInvalidOperandCount) {
		t.Errorf("errors.Is(err, ErrInvalidOperandCount) = false")
	}
	if want := "expected 2 operands for add, got 1"; calcErr.Message != want {
		t.Errorf("Message = %q, want %q", calcErr.Message, want)
	}
}

func TestErrorTextIsItsMessage(t *testing.T) {
	_, err := calc.Evaluate("add", nil)
	if want := "expected 2 operands for add, got 0"; err.Error() != want {
		t.Errorf("Error() = %q, want %q", err.Error(), want)
	}
}
