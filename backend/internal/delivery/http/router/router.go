package router

import (
	"chatterbox/internal/delivery/http/handler"
	"chatterbox/internal/delivery/http/middleware"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	chimid "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

type Handlers struct {
	Auth    *handler.AuthHandler
	User    *handler.UserHandler
	Group   *handler.GroupHandler
	Friend  *handler.FriendHandler
	Message *handler.MessageHandler
	WS      *handler.WebsocketHandler
}

func fileServer(r chi.Router, path string, root http.FileSystem) {
	if strings.ContainsAny(path, "{}*") {
		panic("FileServer does not permit URL parameters.")
	}
	fs := http.StripPrefix(path, http.FileServer(root))
	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", 301).ServeHTTP)
		path += "/"
	}
	path += "*"
	r.Get(path, fs.ServeHTTP)
}

func SetupRoutes(r *chi.Mux, h *Handlers, authMiddleware func(http.Handler) http.Handler, limiter, authLimiter *middleware.IPRateLimiter) {
	// Basic middleware
	r.Use(chimid.RequestID)
	r.Use(chimid.RealIP)
	r.Use(chimid.Logger)
	r.Use(chimid.Recoverer)

	// CORS configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"}, // Adjusted for Vite default port
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})
	
	// Serve static files (avatars)
	workDir, _ := filepath.Abs("./static")
	fileServer(r, "/static", http.Dir(workDir))


	r.Route("/api", func(r chi.Router) {
		// General rate limiter for all API routes
		r.Use(limiter.Middleware)

		// WebSocket connection - uses token in query param, handled separately
		r.Get("/ws", h.WS.ServeWs)
		
		// Auth routes with stricter rate limiting
		r.Group(func(r chi.Router) {
			r.Use(authLimiter.Middleware)
			r.Post("/auth/register", h.Auth.Register)
			r.Post("/auth/login", h.Auth.Login)
			r.Post("/auth/refresh", h.Auth.RefreshToken)
			r.Post("/auth/request-otp", h.Auth.RequestOTP)
			r.Post("/auth/reset-password", h.Auth.ResetPassword)
		})
		
		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware)

			// Users
			r.Get("/users/me", h.User.GetMe)
			r.Post("/users/me/avatar", h.User.UpdateProfilePicture)

			// Groups
			r.Post("/groups", h.Group.Create)
			r.Post("/groups/{slug}/join", h.Group.Join)
			r.Post("/groups/{slug}/members", h.Group.AddMember)
			r.Delete("/groups/{slug}/members/{userId}", h.Group.RemoveMember)
			
			// Friends
			r.Post("/friends/requests", h.Friend.SendRequest)
			r.Get("/friends/requests", h.Friend.GetPendingRequests)
			r.Put("/friends/requests/{id}", h.Friend.UpdateRequest)
			r.Post("/friends/block", h.Friend.BlockUser)

			// Messages
			r.Get("/messages/pending", h.Message.GetPendingMessages)
			r.Get("/messages/poll", h.Message.PollMessages)
		})
	})
}
