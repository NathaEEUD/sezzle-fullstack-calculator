package calc

// Code is the stable name of a calc failure. Callers map it to a response;
// calc itself knows nothing about transport.
type Code string

const (
	CodeUnknownOperation    Code = "UNKNOWN_OPERATION"
	CodeInvalidOperandCount Code = "INVALID_OPERAND_COUNT"
)

// Error is every failure Evaluate returns. Message names the specific cause.
type Error struct {
	Code    Code
	Message string
}

func (e *Error) Error() string { return e.Message }

// Is makes errors.Is match any *Error with the same Code, so the sentinels
// below work whatever the message.
func (e *Error) Is(target error) bool {
	t, ok := target.(*Error)
	return ok && t.Code == e.Code
}

// Sentinels for errors.Is.
var (
	ErrUnknownOperation    = &Error{Code: CodeUnknownOperation}
	ErrInvalidOperandCount = &Error{Code: CodeInvalidOperandCount}
)
