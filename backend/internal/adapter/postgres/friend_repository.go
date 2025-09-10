package postgres

import (
	"context"
	"errors"

	"chatterbox/internal/domain"
	"chatterbox/internal/repository"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type friendRepository struct {
	db *pgxpool.Pool
}

func NewFriendRepository(db *pgxpool.Pool) repository.FriendRepository {
	return &friendRepository{db: db}
}

func (r *friendRepository) CreateRequest(ctx context.Context, req *domain.FriendRequest) error {
	query := `INSERT INTO friend_requests (id, requester_id, recipient_id, status) VALUES ($1, $2, $3, $4)`
	_, err := r.db.Exec(ctx, query, req.ID, req.RequesterID, req.RecipientID, req.Status)
	return err
}

func (r *friendRepository) UpdateRequestStatus(ctx context.Context, requestID uuid.UUID, status domain.FriendRequestStatus) error {
	query := `UPDATE friend_requests SET status = $1 WHERE id = $2`
	_, err := r.db.Exec(ctx, query, status, requestID)
	return err
}

func (r *friendRepository) FindRequestByID(ctx context.Context, requestID uuid.UUID) (*domain.FriendRequest, error) {
	query := `SELECT id, requester_id, recipient_id, status, created_at, updated_at FROM friend_requests WHERE id = $1`
	req := &domain.FriendRequest{}
	err := r.db.QueryRow(ctx, query, requestID).Scan(&req.ID, &req.RequesterID, &req.RecipientID, &req.Status, &req.CreatedAt, &req.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return req, nil
}

func (r *friendRepository) FindPendingRequests(ctx context.Context, userID uuid.UUID) ([]*domain.FriendRequest, error) {
	query := `SELECT id, requester_id, recipient_id, status, created_at, updated_at FROM friend_requests WHERE recipient_id = $1 AND status = 'pending'`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []*domain.FriendRequest
	for rows.Next() {
		req := &domain.FriendRequest{}
		err := rows.Scan(&req.ID, &req.RequesterID, &req.RecipientID, &req.Status, &req.CreatedAt, &req.UpdatedAt)
		if err != nil {
			return nil, err
		}
		requests = append(requests, req)
	}
	return requests, nil
}

func (r *friendRepository) AddFriend(ctx context.Context, userID1, userID2 uuid.UUID) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `INSERT INTO friends (user_id_1, user_id_2) VALUES ($1, $2)`
	if _, err := tx.Exec(ctx, query, userID1, userID2); err != nil {
		// Ignore conflicts in case of race conditions
		if !isDuplicateKeyError(err) {
			return err
		}
	}
	if _, err := tx.Exec(ctx, query, userID2, userID1); err != nil {
		if !isDuplicateKeyError(err) {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *friendRepository) BlockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	query := `INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`
	_, err := r.db.Exec(ctx, query, blockerID, blockedID)
	return err
}

func (r *friendRepository) UnblockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	query := `DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`
	_, err := r.db.Exec(ctx, query, blockerID, blockedID)
	return err
}

func (r *friendRepository) AreFriends(ctx context.Context, userID1, userID2 uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM friends WHERE user_id_1 = $1 AND user_id_2 = $2)`
	var exists bool
	err := r.db.QueryRow(ctx, query, userID1, userID2).Scan(&exists)
	return exists, err
}

func (r *friendRepository) IsBlocked(ctx context.Context, userID1, userID2 uuid.UUID) (bool, error) {
	// Checks if userID1 has blocked userID2 OR userID2 has blocked userID1
	query := `SELECT EXISTS(
		SELECT 1 FROM blocked_users WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
	)`
	var exists bool
	err := r.db.QueryRow(ctx, query, userID1, userID2).Scan(&exists)
	return exists, err
}
