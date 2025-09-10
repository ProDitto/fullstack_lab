package handler

import (
	"chatterbox/internal/api"
	"chatterbox/internal/usecase"
	"chatterbox/internal/util"
	"net/http"
	"strconv"
	"time"
)

type MessageHandler struct {
	usecase usecase.MessageUsecase
}

func NewMessageHandler(u usecase.MessageUsecase) *MessageHandler {
	return &MessageHandler{usecase: u}
}

func (h *MessageHandler) GetPendingMessages(w http.ResponseWriter, r *http.Request) {
	userID, ok := util.GetUserIDFromContext(r.Context())
	if !ok {
		util.WriteError(w, http.StatusUnauthorized, "missing user ID in context")
		return
	}

	cursor := r.URL.Query().Get("cursor")
	limitStr := r.URL.Query().Get("limit")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}

	messages, nextCursor, err := h.usecase.GetPendingMessages(r.Context(), userID, cursor, limit)
	if err != nil {
		util.HandleError(w, err)
		return
	}

	dtos := make([]api.MessageDTO, len(messages))
	for i, msg := range messages {
		dtos[i] = api.MessageDTO{
			ID:          msg.ID,
			SenderID:    msg.SenderID,
			RecipientID: msg.RecipientID,
			GroupID:     msg.GroupID,
			Content:     msg.Content,
			Status:      string(msg.Status),
			CreatedAt:   msg.CreatedAt,
		}
	}

	resp := api.PaginatedMessagesResponse{
		Messages:   dtos,
		NextCursor: nextCursor,
	}

	util.WriteJSON(w, http.StatusOK, resp)
}

// LongPolling handler
func (h *MessageHandler) PollMessages(w http.ResponseWriter, r *http.Request) {
	userID, ok := util.GetUserIDFromContext(r.Context())
	if !ok {
		util.WriteError(w, http.StatusUnauthorized, "missing user ID in context")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
	defer cancel()

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.WriteHeader(http.StatusNoContent)
			return
		case <-ticker.C:
			// Using an empty cursor to always get the latest
			messages, _, err := h.usecase.GetPendingMessages(ctx, userID, "", 20)
			if err != nil {
				util.HandleError(w, err)
				return
			}
			if len(messages) > 0 {
				dtos := make([]api.MessageDTO, len(messages))
				for i, msg := range messages {
					dtos[i] = api.MessageDTO{ID: msg.ID, SenderID: msg.SenderID, RecipientID: msg.RecipientID, GroupID: msg.GroupID, Content: msg.Content, Status: string(msg.Status), CreatedAt: msg.CreatedAt}
				}
				util.WriteJSON(w, http.StatusOK, dtos)
				return
			}
		}
	}
}
