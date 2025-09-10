package handler

import (
	"log/slog"
	"net/http"

	"chatterbox/internal/delivery/websocket"
	"chatterbox/internal/util"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all connections for development.
		// In production, you should have a whitelist of origins.
		return true
	},
}

type WebsocketHandler struct {
	hub *websocket.Hub
}

func NewWebsocketHandler(hub *websocket.Hub) *WebsocketHandler {
	return &WebsocketHandler{hub: hub}
}

func (h *WebsocketHandler) ServeWs(w http.ResponseWriter, r *http.Request) {
	// The token is now passed as a query parameter for WebSocket connections,
	// since headers are not as straightforward to set in browser WebSocket APIs.
	// Auth middleware is thus bypassed for this specific handler.
	token := r.URL.Query().Get("token")
	if token == "" {
		util.WriteError(w, http.StatusUnauthorized, "missing token")
		return
	}

	claims, err := util.StaticTokenManager.VerifyAccessToken(token)
	if err != nil {
		util.WriteError(w, http.StatusUnauthorized, "invalid token")
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("failed to upgrade connection", "error", err)
		return
	}

	client := websocket.NewClient(h.hub, conn, claims.UserID)
	h.hub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}
