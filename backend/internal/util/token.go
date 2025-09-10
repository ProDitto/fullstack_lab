package util

import (
	"time"

	"chatterbox/internal/domain"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var StaticTokenManager *TokenManager

type TokenManager struct {
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	jwt.RegisteredClaims
}

func NewTokenManager(accessSecret, refreshSecret string, accessTTL, refreshTTL time.Duration) *TokenManager {
	return &TokenManager{
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
	}
}

func (tm *TokenManager) GenerateAccessToken(userID uuid.UUID) (string, error) {
	return tm.generateToken(userID, tm.accessTTL, tm.accessSecret)
}

func (tm *TokenManager) GenerateRefreshToken(userID uuid.UUID) (string, error) {
	return tm.generateToken(userID, tm.refreshTTL, tm.refreshSecret)
}

func (tm *TokenManager) generateToken(userID uuid.UUID, ttl time.Duration, secret []byte) (string, error) {
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

func (tm *TokenManager) VerifyAccessToken(tokenString string) (*Claims, error) {
	return tm.verifyToken(tokenString, tm.accessSecret)
}

func (tm *TokenManager) VerifyRefreshToken(tokenString string) (*Claims, error) {
	return tm.verifyToken(tokenString, tm.refreshSecret)
}

func (tm *TokenManager) verifyToken(tokenString string, secret []byte) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return secret, nil
	})

	if err != nil {
		return nil, domain.ErrTokenInvalid
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, domain.ErrTokenInvalid
}
