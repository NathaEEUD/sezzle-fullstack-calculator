package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/NathaEEUD/sezzle-fullstack-calculator/backend/internal/calc"
)

type calculationRequest struct {
	Operation string    `json:"operation"`
	Operands  []float64 `json:"operands"`
}

type calculationResponse struct {
	Operation string    `json:"operation"`
	Operands  []float64 `json:"operands"`
	Result    float64   `json:"result"`
}

func (a *api) calculate(w http.ResponseWriter, r *http.Request) {
	var req calculationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		a.writeError(w, r, &requestError{code: codeInvalidJSON, message: "request body is not valid JSON"})
		return
	}

	result, err := calc.Evaluate(req.Operation, req.Operands)
	if err != nil {
		a.writeError(w, r, err)
		return
	}
	a.writeJSON(w, r, http.StatusOK, calculationResponse{Operation: req.Operation, Operands: req.Operands, Result: result})
}
