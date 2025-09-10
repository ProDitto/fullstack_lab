package postgres

import (
	"context"
	"errors"

	"chatterbox/internal/domain"
	"chatterbox/internal/repository"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)
const uniqueViolation = "23505"

func isDuplicateKeyError(err error) bool {
    var pgErr *pgconn.PgError
    if errors.As(err, &pgErr) {
        return pgErr.Code == uniqueViolation
    }
    return false
}

type groupRepository struct {
	db *pgxpool.Pool
}

func NewGroupRepository(db *pgxpool.Pool) repository.GroupRepository {
	return &groupRepository{db: db}
}

func (r *groupRepository) Create(ctx context.Context, group *domain.Group) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	groupQuery := `INSERT INTO groups (id, name, slug, owner_id) VALUES ($1, $2, $3, $4)`
	_, err = tx.Exec(ctx, groupQuery, group.ID, group.Name, group.Slug, group.OwnerID)
	if err != nil {
		if isDuplicateKeyError(err) {
			return domain.ErrConflict
		}
		return err
	}

	memberQuery := `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)`
	_, err = tx.Exec(ctx, memberQuery, group.ID, group.OwnerID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *groupRepository) FindBySlug(ctx context.Context, slug string) (*domain.Group, error) {
	query := `SELECT id, name, slug, owner_id, created_at, updated_at FROM groups WHERE slug = $1`
	group := &domain.Group{}
	err := r.db.QueryRow(ctx, query, slug).Scan(&group.ID, &group.Name, &group.Slug, &group.OwnerID, &group.CreatedAt, &group.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return group, nil
}

func (r *groupRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Group, error) {
	query := `SELECT id, name, slug, owner_id, created_at, updated_at FROM groups WHERE id = $1`
	group := &domain.Group{}
	err := r.db.QueryRow(ctx, query, id).Scan(&group.ID, &group.Name, &group.Slug, &group.OwnerID, &group.CreatedAt, &group.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return group, nil
}


func (r *groupRepository) AddMember(ctx context.Context, groupID, userID uuid.UUID) error {
	query := `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`
	_, err := r.db.Exec(ctx, query, groupID, userID)
	return err
}

func (r *groupRepository) RemoveMember(ctx context.Context, groupID, userID uuid.UUID) error {
	query := `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`
	_, err := r.db.Exec(ctx, query, groupID, userID)
	return err
}

func (r *groupRepository) IsMember(ctx context.Context, groupID, userID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2)`
	var exists bool
	err := r.db.QueryRow(ctx, query, groupID, userID).Scan(&exists)
	return exists, err
}

func (r *groupRepository) MemberCount(ctx context.Context, groupID uuid.UUID) (int, error) {
	query := `SELECT count(*) FROM group_members WHERE group_id = $1`
	var count int
	err := r.db.QueryRow(ctx, query, groupID).Scan(&count)
	return count, err
}


func (r *groupRepository) Delete(ctx context.Context, groupID uuid.UUID) error {
	query := `DELETE FROM groups WHERE id = $1`
	_, err := r.db.Exec(ctx, query, groupID)
	return err
}

func (r *groupRepository) GetMemberIDs(ctx context.Context, groupID uuid.UUID) ([]uuid.UUID, error) {
	query := `SELECT user_id FROM group_members WHERE group_id = $1`
	rows, err := r.db.Query(ctx, query, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var memberIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		memberIDs = append(memberIDs, id)
	}
	return memberIDs, nil
}
