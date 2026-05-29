package service

import (
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"jobmaster/internal/model"
)

// ImageStorage handles image file storage for work order logs
type ImageStorage struct {
	db     *gorm.DB
	basePath string
}

// NewImageStorage creates a new ImageStorage instance
func NewImageStorage(db *gorm.DB) *ImageStorage {
	basePath := os.Getenv("LOG_STORAGE_PATH")
	if basePath == "" {
		basePath = "./data/logs"
	}
	return &ImageStorage{db: db, basePath: basePath}
}

// ImageResult is the result of a successful image upload
type ImageResult struct {
	FileKey      string `json:"file_key"`
	ThumbnailKey string `json:"thumbnail_key,omitempty"`
	FileSize     int64  `json:"file_size"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
}

// SaveImage saves an uploaded image to disk and records metadata in log_images table
func (s *ImageStorage) SaveImage(workOrderID uuid.UUID, uploadedBy uuid.UUID, reader io.Reader, filename string) (*ImageResult, error) {
	orderShort := workOrderID.String()[:8]
	dirPath := filepath.Join(s.basePath, orderShort)
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage dir: %w", err)
	}

	ext := filepath.Ext(filename)
	if ext == "" {
		ext = ".jpg"
	}

	fileID := uuid.New().String()
	fileKey := fmt.Sprintf("%s/%s%s", orderShort, fileID, ext)
	fullPath := filepath.Join(s.basePath, fileKey)

	f, err := os.Create(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer f.Close()

	written, err := io.Copy(f, reader)
	if err != nil {
		os.Remove(fullPath)
		return nil, fmt.Errorf("failed to write file: %w", err)
	}

	// Get image dimensions
	imgW, imgH := 0, 0
	if fh, err := os.Open(fullPath); err == nil {
		defer fh.Close()
		if cfg, _, err := image.DecodeConfig(fh); err == nil {
			imgW = cfg.Width
			imgH = cfg.Height
		}
	}

	// Record in DB
	logImage := &model.LogImage{
		ID:          uuid.New(),
		FileKey:     fileKey,
		FileSize:    written,
		Width:       imgW,
		Height:      imgH,
		UploadedAt:  time.Now(),
		UploadedBy:  uploadedBy,
		WorkOrderID: workOrderID,
	}
	if err := s.db.Create(logImage).Error; err != nil {
		os.Remove(fullPath)
		return nil, fmt.Errorf("failed to create log_image record: %w", err)
	}

	return &ImageResult{
		FileKey:  fileKey,
		FileSize: written,
		Width:    imgW,
		Height:   imgH,
	}, nil
}

// GetFilePath returns the full file path for a file key
func (s *ImageStorage) GetFilePath(fileKey string) string {
	return filepath.Join(s.basePath, fileKey)
}

// BuildFileKey from components
func BuildFileKey(orderShort, fileID, ext string) string {
	return fmt.Sprintf("%s/%s%s", orderShort, fileID, ext)
}
