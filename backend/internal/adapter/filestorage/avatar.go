package filestorage

import (
	"fmt"
	"image"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"chatterbox/internal/domain"
	"github.com/disintegration/imaging"
	"github.com/google/uuid"
)

const avatarSize = 256 // Resize avatars to 256x256

type LocalAvatarStorage struct {
	basePath string
}

func NewLocalAvatarStorage(basePath string) *LocalAvatarStorage {
	if err := os.MkdirAll(basePath, os.ModePerm); err != nil {
		panic(fmt.Sprintf("failed to create avatar storage directory: %v", err))
	}
	return &LocalAvatarStorage{basePath: basePath}
}

func (s *LocalAvatarStorage) Save(userID uuid.UUID, file multipart.File) (string, error) {
	// Decode the image
	img, _, err := image.Decode(file)
	if err != nil {
		return "", fmt.Errorf("%w: failed to decode image", domain.ErrValidation)
	}

	// Resize the image to a standard size
	resizedImg := imaging.Fill(img, avatarSize, avatarSize, imaging.Center, imaging.Lanczos)

	// Create a unique filename and path
	filename := fmt.Sprintf("%s.webp", userID.String())
	filePath := filepath.Join(s.basePath, filename)

	// Create the destination file
	destFile, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create destination file: %w", err)
	}
	defer destFile.Close()

	// Encode the resized image as WebP for efficiency
	if err := imaging.Encode(destFile, resizedImg, imaging.WebP); err != nil {
		return "", fmt.Errorf("failed to encode image to webp: %w", err)
	}

	// Return the public URL path
	publicPath := filepath.ToSlash(filepath.Join("/static/avatars", filename))
	return publicPath, nil
}
