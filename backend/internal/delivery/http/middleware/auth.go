package middleware

import (
	"chatterbox/internal/util"
	"context"
	"net/http"
	"strings"
)

type CtxKey string

const UserIDKey CtxKey = "userID"

func AuthMiddleware(tm *util.TokenManager) func(http.Handler) http.Handler {
	// Store the token manager statically so the websocket handler can use it
	util.StaticTokenManager = tm
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				util.WriteError(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			headerParts := strings.Split(authHeader, " ")
			if len(headerParts) != 2 || headerParts[0] != "Bearer" {
				util.WriteError(w, http.StatusUnauthorized, "invalid authorization header format")
				return
			}

			tokenString := headerParts[1]
			claims, err := tm.VerifyAccessToken(tokenString)
			if err != nil {
				util.WriteError(w, http.StatusUnauthorized, "invalid token")
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
