package middleware

import (
	"net/http"
	"sync"
	"time"

	"chatterbox/internal/util"
	"golang.org/x/time/rate"
)

// IPRateLimiter stores the rate limiters for each IP address.
type IPRateLimiter struct {
	ips    map[string]*rate.Limiter
	mu     sync.Mutex
	rate   rate.Limit
	burst  int
}

// NewRateLimiter initializes a new IPRateLimiter.
func NewRateLimiter(r float64, b int, cleanupInterval time.Duration) *IPRateLimiter {
	limiter := &IPRateLimiter{
		ips:   make(map[string]*rate.Limiter),
		rate:  rate.Limit(r / float64(time.Minute.Seconds())),
		burst: b,
	}

    // Periodically clean up old entries
	go func() {
		for {
			time.Sleep(cleanupInterval)
			limiter.mu.Lock()
			if len(limiter.ips) > 10000 { // Prevent unbounded growth
				for ip := range limiter.ips {
					delete(limiter.ips, ip)
					if len(limiter.ips) < 5000 {
						break
					}
				}
			}
			limiter.mu.Unlock()
		}
	}()

	return limiter
}

// getLimiter creates a new rate limiter for an IP address if one doesn't exist.
func (i *IPRateLimiter) getLimiter(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	limiter, exists := i.ips[ip]
	if !exists {
		limiter = rate.NewLimiter(i.rate, i.burst)
		i.ips[ip] = limiter
	}
	return limiter
}

// Middleware is a middleware that applies rate limiting per IP address.
func (i *IPRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		limiter := i.getLimiter(ip)
		if !limiter.Allow() {
			util.WriteError(w, http.StatusTooManyRequests, "too many requests")
			return
		}
		next.ServeHTTP(w, r)
	})
}
