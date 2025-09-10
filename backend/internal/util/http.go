package util

import (
	"encoding/json"
	"errors"
	"net/http"

	"chatterbox/internal/domain"
)

func WriteJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		json.NewEncoder(w).Encode(data)
	}
}

func WriteError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]string{"error": message})
}

func HandleError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		WriteError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, domain.ErrInvalidCredentials), errors.Is(err, domain.ErrOTPInvalid):
		WriteError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, domain.ErrUnauthorized), errors.Is(err, domain.ErrTokenInvalid), errors.Is(err, domain.ErrTokenExpired):
		WriteError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, domain.ErrForbidden):
		WriteError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, domain.ErrConflict):
		WriteError(w, http.StatusConflict, err.Error())
	case errors.Is(err, domain.ErrValidation), errors.Is(err, domain.ErrBadRequest):
		WriteError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, domain.ErrRateLimitExceeded):
		WriteError(w, http.StatusTooManyRequests, err.Error())
	default:
		WriteError(w, http.StatusInternalServerError, "an unexpected error occurred")
	}
}
