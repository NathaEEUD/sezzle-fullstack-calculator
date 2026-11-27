package logging_test

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"github.com/NathaEEUD/sezzle-fullstack-calculator/backend/internal/logging"
)

func TestNewWritesJSONLinesAtTheLevelLOG_LEVELNames(t *testing.T) {
	tests := []struct {
		level string
		want  []string
	}{
		{"", []string{"INFO", "WARN", "ERROR"}},
		{"debug", []string{"DEBUG", "INFO", "WARN", "ERROR"}},
		{"info", []string{"INFO", "WARN", "ERROR"}},
		{"WARN", []string{"WARN", "ERROR"}},
		{"error", []string{"ERROR"}},
	}
	for _, tt := range tests {
		t.Run("LOG_LEVEL="+tt.level, func(t *testing.T) {
			var out bytes.Buffer
			logger, err := logging.New(&out, tt.level)
			if err != nil {
				t.Fatalf("New(%q) error = %v, want nil", tt.level, err)
			}
			logger.Debug("d")
			logger.Info("i")
			logger.Warn("w")
			logger.Error("e")

			var got []string
			for line := range strings.Lines(out.String()) {
				var entry map[string]any
				if err := json.Unmarshal([]byte(line), &entry); err != nil {
					t.Fatalf("log line = %q, want JSON: %v", line, err)
				}
				got = append(got, entry["level"].(string))
			}
			if strings.Join(got, ",") != strings.Join(tt.want, ",") {
				t.Errorf("levels written = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNewRefusesAnUnknownLevel(t *testing.T) {
	if _, err := logging.New(&bytes.Buffer{}, "loud"); err == nil {
		t.Error(`New("loud") error = nil, want an error`)
	}
}
