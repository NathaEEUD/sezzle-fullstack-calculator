package httpapi

import (
	"net/http"

	"github.com/NathaEEUD/sezzle-fullstack-calculator/backend/internal/calc"
)

type operationsResponse struct {
	Operations []operationResponse `json:"operations"`
}

type operationResponse struct {
	Name  string `json:"name"`
	Arity int    `json:"arity"`
}

func (a *api) operations(w http.ResponseWriter, r *http.Request) {
	operations := calc.Operations()
	body := operationsResponse{Operations: make([]operationResponse, len(operations))}
	for i, op := range operations {
		body.Operations[i] = operationResponse{Name: op.Name, Arity: op.Arity}
	}
	a.writeJSON(w, r, http.StatusOK, body)
}
