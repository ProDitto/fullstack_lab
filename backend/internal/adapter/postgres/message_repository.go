package postgres

import (
	"context"
	"fmt"
	"time"

	"chatterbox/internal/domain"
	"chatterbox/internal/repository"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type messageRepository struct {
	db *pgxpool.Pool
}

func NewMessageRepository(db *pgxpool.Pool) repository.MessageRepository {
	return &messageRepository{db: db}
}

func (r *messageRepository) StoreUnsent(ctx context.Context, msg *domain.Message) error {
	query := `
		INSERT INTO unsent_messages (id, sender_id, recipient_id, group_id, content, status, created_at, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	expiresAt := time.Now().Add(24 * time.Hour) // Retain for 1 day
	_, err := r.db.Exec(ctx, query, msg.ID, msg.SenderID, msg.RecipientID, msg.GroupID, msg.Content, msg.Status, msg.CreatedAt, expiresAt)
	return err
}

func (r *messageRepository) DeleteSent(ctx context.Context, msgID uuid.UUID) error {
	query := `DELETE FROM unsent_messages WHERE id = $1`
	_, err := r.db.Exec(ctx, query, msgID)
	return err
}

func (r *messageRepository) FindPendingForUser(ctx context.Context, userID uuid.UUID, cursor string, limit int) ([]*domain.Message, string, error) {
	query := `
		SELECT id, sender_id, recipient_id, group_id, content, status, created_at 
		FROM unsent_messages
		WHERE (recipient_id = $1 OR group_id IN (SELECT group_id FROM group_members WHERE user_id = $1))
		AND created_at > $2
		AND sender_id != $1 -- Don't fetch our own sent messages that are pending for others
		AND expires_at > NOW()
		ORDER BY created_at
		LIMIT $3
	`

	var cursorTime time.Time
	if cursor == "" {
		cursorTime = time.Time{} // Beginning of time
	} else {
		parsedTime, err := time.Parse(time.RFC3339Nano, cursor)
		if err != nil {
			return nil, "", fmt.Errorf("invalid cursor format: %w", err)
		}
		cursorTime = parsedTime
	}

	rows, err := r.db.Query(ctx, query, userID, cursorTime, limit)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var messages []*domain.Message
	var lastTimestamp time.Time
	for rows.Next() {
		msg := &domain.Message{}
		err := rows.Scan(&msg.ID, &msg.SenderID, &msg.RecipientID, &msg.GroupID, &msg.Content, &msg.Status, &msg.CreatedAt)
		if err != nil {
			return nil, "", err
		}
		messages = append(messages, msg)
		lastTimestamp = msg.CreatedAt
	}

	var nextCursor string
	if len(messages) == limit {
		nextCursor = lastTimestamp.Format(time.RFC3339Nano)
	}

	return messages, nextCursor, nil
}
