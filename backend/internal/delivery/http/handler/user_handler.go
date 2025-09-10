package handler

import (
	"bytes"
	"chatterbox/internal/api"
	"chatterbox/internal/domain"
	"chatterbox/internal/usecase"
	"chatterbox/internal/util"
	"net/http"
)

const maxUploadSize = 200 * 1024 // 200 KB

type UserHandler struct {
	usecase usecase.UserUsecase
}

func NewUserHandler(u usecase.UserUsecase) *UserHandler {
	return &UserHandler{usecase: u}
}

func (h *UserHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := util.GetUserIDFromContext(r.Context())
	if !ok {
		util.WriteError(w, http.StatusUnauthorized, "missing user ID in context")
		return
	}

	user, err := h.usecase.GetProfile(r.Context(), userID)
	if err != nil {
		util.HandleError(w, err)
		return
	}

	resp := &api.UserDTO{
		ID:                user.ID,
		Email:             user.Email,
		ProfilePictureURL: user.ProfilePictureURL,
	}
	util.WriteJSON(w, http.StatusOK, resp)
}

func (h *UserHandler) UpdateProfilePicture(w http.ResponseWriter, r *http.Request) {
	userID, ok := util.GetUserIDFromContext(r.Context())
	if !ok {
		util.WriteError(w, http.StatusUnauthorized, "missing user ID in context")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		util.WriteError(w, http.StatusBadRequest, "file is too large")
		return
	}

	file, _, err := r.FormFile("avatar")
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid file")
		return
	}
	defer file.Close()

	// Read file into buffer to perform MIME type check without consuming the reader
	buf := bytes.NewBuffer(nil)
	if _, err := io.Copy(buf, file); err != nil {
		util.HandleError(w, domain.ErrInternalServer)
		return
	}
	
	// Reset file reader
	file.Seek(0, io.SeekStart)

	// MIME type validation
	contentType := http.DetectContentType(buf.Bytes())
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/webp" {
		util.WriteError(w, http.StatusBadRequest, "invalid file type, only jpeg, png, and webp are allowed")
		return
	}

	url, err := h.usecase.UpdateProfilePicture(r.Context(), userID, file)
	if err != nil {
		util.HandleError(w, err)
		return
	}
	
	util.WriteJSON(w, http.StatusOK, map[string]string{"profilePictureUrl": url})
}
