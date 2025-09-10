package handler

import (
	"chatterbox/internal/api"
	"chatterbox/internal/usecase"
	"chatterbox/internal/util"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type GroupHandler struct {
	usecase usecase.GroupUsecase
}

func NewGroupHandler(u usecase.GroupUsecase) *GroupHandler {
	return &GroupHandler{usecase: u}
}

func (h *GroupHandler) Create(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := util.GetUserIDFromContext(r.Context())
	if !ok {
		util.WriteError(w, http.StatusUnauthorized, "missing user ID in context")
		return
	}

	var req api.CreateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	group, err := h.usecase.CreateGroup(r.Context(), req.Name, req.Slug, ownerID)
	if err != nil {
		util.HandleError(w, err)
		return
	}

	resp := api.GroupDTO{
		ID:        group.ID,
		Name:      group.Name,
		Slug:      group.Slug,
		OwnerID:   group.OwnerID,
		CreatedAt: group.CreatedAt,
	}

	util.WriteJSON(w, http.StatusCreated, resp)
}

func (h *GroupHandler) Join(w http.ResponseWriter, r *http.Request) {
	userID, ok := util.GetUserIDFromContext(r.Context())
	if !ok {
		util.WriteError(w, http.StatusUnauthorized, "missing user ID in context")
		return
	}

	slug := chi.URLParam(r, "slug")
	if slug == "" {
		util.WriteError(w, http.StatusBadRequest, "missing group slug")
		return
	}

	if err := h.usecase.JoinGroup(r.Context(), slug, userID); err != nil {
		util.HandleError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *GroupHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	adderID, ok := util.GetUserIDFromContext(r.Context())
	if !ok {
		util.WriteError(w, http.StatusUnauthorized, "missing user ID in context")
		return
	}

	slug := chi.URLParam(r, "slug")
	if slug == "" {
		util.WriteError(w, http.StatusBadRequest, "missing group slug")
		return
	}

	var req api.AddGroupMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.usecase.AddMember(r.Context(), slug, adderID, req.UserID); err != nil {
		util.HandleError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *GroupHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	removerID, ok := util.GetUserIDFromContext(r.Context())
	if !ok {
		util.WriteError(w, http.StatusUnauthorized, "missing user ID in context")
		return
	}

	slug := chi.URLParam(r, "slug")
	if slug == "" {
		util.WriteError(w, http.StatusBadRequest, "missing group slug")
		return
	}
	
	memberIDStr := chi.URLParam(r, "userId")
	memberID, err := uuid.Parse(memberIDStr)
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid user ID")
		return
	}


	if err := h.usecase.RemoveMember(r.Context(), slug, removerID, memberID); err != nil {
		util.HandleError(w, err)
		return
	}
	
	w.WriteHeader(http.StatusOK)
}
