package handler

import (
	"chatterbox/internal/api"
	"chatterbox/internal/usecase"
	"chatterbox/internal/util"
	"encoding/json"
	"log/slog"
	"net/http"
)

type AuthHandler struct {
	authUsecase usecase.AuthUsecase
	userUsecase usecase.UserUsecase
}

func NewAuthHandler(authUsecase usecase.AuthUsecase, userUsecase usecase.UserUsecase) *AuthHandler {
	return &AuthHandler{authUsecase: authUsecase, userUsecase: userUsecase}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req api.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.userUsecase.Register(r.Context(), req.Email, req.Password)
	if err != nil {
		util.HandleError(w, err)
		return
	}

	util.WriteJSON(w, http.StatusCreated, &api.UserDTO{
		ID:    user.ID,
		Email: user.Email,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req api.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	accessToken, refreshToken, user, err := h.authUsecase.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		util.HandleError(w, err)
		return
	}

	resp := api.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: &api.UserDTO{
			ID:                user.ID,
			Email:             user.Email,
			ProfilePictureURL: user.ProfilePictureURL,
		},
	}
	util.WriteJSON(w, http.StatusOK, resp)
}

func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req api.RefreshTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	accessToken, refreshToken, err := h.authUsecase.RefreshToken(r.Context(), req.RefreshToken)
	if err != nil {
		util.HandleError(w, err)
		return
	}

	resp := map[string]string{
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
	}
	util.WriteJSON(w, http.StatusOK, resp)
}

func (h *AuthHandler) RequestOTP(w http.ResponseWriter, r *http.Request) {
	var req api.RequestOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	otp, err := h.authUsecase.RequestPasswordReset(r.Context(), req.Email)
	if err != nil {
		// Do not reveal if the user exists or not.
		// Log the actual error and return a generic success message.
		slog.Warn("RequestOTP failed but sending generic response", "email", req.Email, "error", err)
	}

	// For development/testing purposes, we log the OTP.
	// DO NOT DO THIS IN PRODUCTION.
	slog.Info("Generated OTP for password reset", "email", req.Email, "otp", otp)

	util.WriteJSON(w, http.StatusOK, map[string]string{"message": "If a user with that email exists, an OTP has been sent."})
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req api.ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	err := h.authUsecase.ResetPassword(r.Context(), req.Email, req.OTP, req.NewPassword)
	if err != nil {
		util.HandleError(w, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, map[string]string{"message": "Password has been reset successfully."})
}
