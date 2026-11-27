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
