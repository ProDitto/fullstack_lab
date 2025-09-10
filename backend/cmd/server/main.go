package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"chatterbox/internal/adapter/filestorage"
	"chatterbox/internal/adapter/inmemory"
	"chatterbox/internal/adapter/postgres"
	"chatterbox/internal/config"
	"chatterbox/internal/delivery/http/handler"
	"chatterbox/internal/delivery/http/middleware"
	"chatterbox/internal/delivery/http/router"
	"chatterbox/internal/delivery/websocket"
	"chatterbox/internal/usecase"
	"chatterbox/internal/util"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.New()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	ctx := context.Background()

	dbPool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("unable to connect to database", "error", err)
		os.Exit(1)
	}
	defer dbPool.Close()

	if err := postgres.RunMigrations(cfg.DatabaseURL); err != nil {
		slog.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}
	slog.Info("migrations completed successfully")


	// Dependencies
	passwordHasher := util.NewPasswordHasher()
	tokenManager := util.NewTokenManager(cfg.AccessTokenSecret, cfg.RefreshTokenSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL)
	rateLimiter := middleware.NewRateLimiter(5, 10, time.Minute) 
	authRateLimiter := middleware.NewRateLimiter(2, 5, time.Minute) 
	
	// Adapters
	otpStore := inmemory.NewOTPStore(10*time.Minute, 5, 1*time.Minute)
	avatarStorage := filestorage.NewLocalAvatarStorage("static/avatars")


	// Repositories
	userRepo := postgres.NewUserRepository(dbPool)
	groupRepo := postgres.NewGroupRepository(dbPool)
	friendRepo := postgres.NewFriendRepository(dbPool)
	messageRepo := postgres.NewMessageRepository(dbPool)

	// Usecases
	authUsecase := usecase.NewAuthUsecase(userRepo, passwordHasher, tokenManager, otpStore)
	userUsecase := usecase.NewUserUsecase(userRepo, passwordHasher, avatarStorage)
	groupUsecase := usecase.NewGroupUsecase(groupRepo, friendRepo)
	friendUsecase := usecase.NewFriendUsecase(friendRepo)
	messageUsecase := usecase.NewMessageUsecase(messageRepo)

	// Websocket Hub
	hub := websocket.NewHub(messageUsecase, friendRepo)
	go hub.Run()

	// HTTP Handlers
	authHandler := handler.NewAuthHandler(authUsecase, userUsecase)
	userHandler := handler.NewUserHandler(userUsecase)
	groupHandler := handler.NewGroupHandler(groupUsecase)
	friendHandler := handler.NewFriendHandler(friendUsecase)
	messageHandler := handler.NewMessageHandler(messageUsecase)
	wsHandler := handler.NewWebsocketHandler(hub)

	// Middleware
	authMiddleware := middleware.AuthMiddleware(tokenManager)

	// Router
	r := chi.NewRouter()
	router.SetupRoutes(r, &router.Handlers{
		Auth:    authHandler,
		User:    userHandler,
		Group:   groupHandler,
		Friend:  friendHandler,
		Message: messageHandler,
		WS:      wsHandler,
	}, authMiddleware, rateLimiter, authRateLimiter)

	// Server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      r,
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	// Graceful Shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		slog.Info(fmt.Sprintf("Server starting on port %d", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server failed to start", "error", err)
			os.Exit(1)
		}
	}()

	<-stop

	slog.Info("Shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server shutdown failed", "error", err)
	} else {
		slog.Info("Server gracefully stopped")
	}
}
