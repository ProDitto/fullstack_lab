package handler

import (
	"chatterbox/internal/api"
	"chatterbox/internal/domain"
	"chatterbox/internal/usecase"
	"chatterbox/internal/util"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type FriendHandler struct {
	usecase usecase.FriendUsecase
}

func NewFriendHandler(u usecase.FriendUsecase) *FriendHandler {
	return &FriendHandler{usecase: u}
}

func (h *FriendHandler) SendRequest(w http.ResponseWriter, r *http.Request) {
	requesterID, ok := util.GetUserIDFromContext(r.Context())
	if !ok {
		util.WriteError(w, http.StatusUnauthorized, "missing user ID in context")
		return
	}

	var req api.SendFriendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.usecase.SendRequest(r.Context(), requesterID, req.RecipientID); err != nil {
		util.HandleError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *FriendHandler) GetPendingRequests(w http.ResponseWriter, r *http.Request) {
	userID, ok := util.GetUserIDFromContext(r.Context())
	if !ok {
		util.WriteError(w, http.StatusUnauthorized, "missing user ID in context")
		return
	}

	requests, err := h.usecase.GetPendingRequests(r.Context(), userID)
	if err != nil {
		util.HandleError(w, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, requests)
}

func (h *FriendHandler) UpdateRequest(w http.ResponseWriter, r *http.Request) {
	userID, ok := util.GetUserIDFromContext(r.Context())
	if !ok {
		util.WriteError(w, http.StatusUnauthorized, "missing user ID in context")
		return
	}

	requestIDStr := chi.URLParam(r, "id")
	requestID, err := uuid.Parse(requestIDStr)
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid request ID")
		return
	}

	var req api.UpdateFriendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	status := domain.FriendRequestStatus(req.Status)
	if status != domain.StatusAccepted && status != domain.StatusRejected {
		util.WriteError(w, http.StatusBadRequest, "invalid status")
		return
	}

	if err := h.usecase.RespondToRequest(r.Context(), requestID, userID, status); err != nil {
		util.HandleError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *FriendHandler) BlockUser(w http.ResponseWriter, r *http.Request) {
	blockerID, ok := util.GetUserIDFromContext(r.Context())
	if !ok {
		util.WriteError(w, http.StatusUnauthorized, "missing user ID in context")
		return
	}

	var req api.BlockUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.usecase.BlockUser(r.Context(), blockerID, req.UserID); err != nil {
		util.HandleError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}
