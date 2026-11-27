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
	writeJSON(w, http.StatusOK, calculationResponse{Operation: req.Operation, Operands: req.Operands, Result: result})
}

func (a *api) healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
