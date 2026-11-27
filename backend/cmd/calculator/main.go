// Command calculator runs the calculation service. It only reads env, wires
// the handler and shuts down; the logic lives in internal/.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/NathaEEUD/sezzle-fullstack-calculator/backend/internal/httpapi"
	"github.com/NathaEEUD/sezzle-fullstack-calculator/backend/internal/logging"
)

func main() {
	logger, err := logging.New(os.Stdout, os.Getenv("LOG_LEVEL"))
	if err != nil {
		slog.Error("server not started", "error", err)
		os.Exit(1)
	}
	if err := run(logger); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	staticDir := os.Getenv("STATIC_DIR")
	allowedOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")

	srv := &http.Server{
		Addr: ":" + port,
		Handler: httpapi.NewHandler(logger,
			httpapi.WithStaticDir(staticDir),
			httpapi.WithCORSAllowedOrigins(allowedOrigins),
		),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	errs := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", srv.Addr, "static_dir", staticDir, "cors_allowed_origins", allowedOrigins)
		errs <- srv.ListenAndServe()
	}()

	select {
	case err := <-errs:
		return err
	case <-ctx.Done():
	}

	logger.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}
	if err := <-errs; !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
