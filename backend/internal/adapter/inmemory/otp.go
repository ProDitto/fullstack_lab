package inmemory

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"sync"
	"time"

	"chatterbox/internal/domain"

	"github.com/patrickmn/go-cache"
)

type otpEntry struct {
	otp      string
	attempts int
}

type OTPStore struct {
	store       *cache.Cache
	mu          sync.Mutex
	maxAttempts int
	cooldown    time.Duration
}

func NewOTPStore(expiration time.Duration, maxAttempts int, cooldown time.Duration) *OTPStore {
	return &OTPStore{
		store:       cache.New(expiration, expiration*2),
		maxAttempts: maxAttempts,
		cooldown:    cooldown,
	}
}

func (s *OTPStore) GenerateAndStore(email string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check for cooldown
	if _, found := s.store.Get(s.cooldownKey(email)); found {
		return "", domain.ErrRateLimitExceeded
	}

	otp, err := s.generateOTP(6)
	if err != nil {
		return "", fmt.Errorf("failed to generate OTP: %w", err)
	}

	entry := &otpEntry{otp: otp, attempts: 0}
	s.store.Set(s.otpKey(email), entry, cache.DefaultExpiration)
	s.store.Set(s.cooldownKey(email), true, s.cooldown)

	return otp, nil
}

func (s *OTPStore) Validate(email, otp string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := s.otpKey(email)
	item, found := s.store.Get(key)
	if !found {
		return domain.ErrOTPInvalid
	}

	entry := item.(*otpEntry)
	if entry.attempts >= s.maxAttempts {
		s.store.Delete(key) // Invalidate after too many attempts
		return domain.ErrOTPInvalid
	}

	if entry.otp != otp {
		entry.attempts++
		s.store.Set(key, entry, cache.DefaultExpiration)
		return domain.ErrOTPInvalid
	}

	// OTP is valid, remove it
	s.store.Delete(key)
	return nil
}

func (s *OTPStore) generateOTP(length int) (string, error) {
	const digits = "0123456789"
	otp := make([]byte, length)
	for i := range otp {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return "", err
		}
		otp[i] = digits[num.Int64()]
	}
	return string(otp), nil
}

func (s *OTPStore) otpKey(email string) string {
	return "otp:" + email
}

func (s *OTPStore) cooldownKey(email string) string {
	return "otp_cooldown:" + email
}
