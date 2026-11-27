// Package logging builds the service's logger from LOG_LEVEL.
package logging

import (
	"fmt"
	"io"
	"log/slog"
)

// New returns a logger that writes JSON lines to w at the level named by
// level (debug, info, warn or error, in any case). An empty level is info, so
// callers can pass LOG_LEVEL as it is.
func New(w io.Writer, level string) (*slog.Logger, error) {
	var l slog.Level
	if level != "" {
		if err := l.UnmarshalText([]byte(level)); err != nil {
			return nil, fmt.Errorf("invalid LOG_LEVEL %q: want debug, info, warn or error", level)
		}
	}
	return slog.New(slog.NewJSONHandler(w, &slog.HandlerOptions{Level: l})), nil
}
