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

	"github.com/disintegration/imaging"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"jobmaster/internal/model"
)

const (
	thumbnailMaxSize = 200
	// URL prefix for serving files. In production this comes from env/config.
	// For demo mode, the Go server serves at the same host:port.
	servingPrefix = "/api/demo/files/"
)

// ImageStorage handles image file storage for work order logs
type ImageStorage struct {
	db       *gorm.DB
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

// ImageUploadResult is the result returned to the frontend
type ImageUploadResult struct {
	FileKey   string `json:"file_key"`
	URL       string `json:"url"`
	ThumbURL  string `json:"thumb_url"`
	FileSize  int64  `json:"file_size"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
}

// SaveImage saves an uploaded image, generates thumbnail, records in log_images table
func (s *ImageStorage) SaveImage(workOrderID uuid.UUID, uploadedBy uuid.UUID, reader io.Reader, filename string) (*ImageUploadResult, error) {
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

	// Save original
	f, err := os.Create(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}

	written, err := io.Copy(f, reader)
	f.Close()
	if err != nil {
		os.Remove(fullPath)
		return nil, fmt.Errorf("failed to write file: %w", err)
	}

	// Get image dimensions
	imgW, imgH := 0, 0
	if fh, err := os.Open(fullPath); err == nil {
		if cfg, _, err := image.DecodeConfig(fh); err == nil {
			imgW = cfg.Width
			imgH = cfg.Height
		}
		fh.Close()
	}

	// Generate thumbnail
	var thumbKey string
	if imgW > 0 && imgH > 0 {
		thumbKey = fmt.Sprintf("%s/%s_thumb%s", orderShort, fileID, ext)
		thumbPath := filepath.Join(s.basePath, thumbKey)
		if err := generateThumbnail(fullPath, thumbPath); err != nil {
			// Non-fatal: log only
			fmt.Printf("[WARN] thumbnail generation failed: %v\n", err)
			thumbKey = ""
		}
	}

	// Build URLs
	imgURL := servingPrefix + fileKey
	thumbURL := ""
	if thumbKey != "" {
		thumbURL = servingPrefix + thumbKey
	}

	// Record in DB
	logImage := &model.LogImage{
		ID:          uuid.New(),
		FileKey:     fileKey,
		ThumbnailKey: thumbKey,
		FileSize:    written,
		Width:       imgW,
		Height:      imgH,
		UploadedAt:  time.Now(),
		UploadedBy:  uploadedBy,
		WorkOrderID: workOrderID,
	}
	if err := s.db.Create(logImage).Error; err != nil {
		os.Remove(fullPath)
		if thumbKey != "" {
			os.Remove(filepath.Join(s.basePath, thumbKey))
		}
		return nil, fmt.Errorf("failed to create log_image record: %w", err)
	}

	return &ImageUploadResult{
		FileKey:  fileKey,
		URL:      imgURL,
		ThumbURL: thumbURL,
		FileSize: written,
		Width:    imgW,
		Height:   imgH,
	}, nil
}

// generateThumbnail creates a 200px thumbnail (preserving aspect ratio)
func generateThumbnail(srcPath, dstPath string) error {
	src, err := imaging.Open(srcPath)
	if err != nil {
		return fmt.Errorf("open: %w", err)
	}
	thumb := imaging.Fit(src, thumbnailMaxSize, thumbnailMaxSize, imaging.Lanczos)
	return imaging.Save(thumb, dstPath)
}

// GetThumbnailPath returns the filesystem path for a thumbnail, or empty if not found
func (s *ImageStorage) GetThumbnailPath(fileKey string) string {
	ext := filepath.Ext(fileKey)
	if ext == "" {
		return ""
	}
	withoutExt := fileKey[:len(fileKey)-len(ext)]
	thumbKey := withoutExt + "_thumb" + ext
	thumbPath := filepath.Join(s.basePath, thumbKey)
	if _, err := os.Stat(thumbPath); err == nil {
		return thumbPath
	}
	// Also check archive path
	parts := []rune(fileKey)
	partsStr := string(parts)
	slashIdx := -1
	for i, c := range partsStr {
		if c == '/' {
			slashIdx = i
			break
		}
	}
	if slashIdx >= 0 {
		archiveKey := partsStr[:slashIdx] + "_archive/" + partsStr[slashIdx+1:]
		archiveThumb := archiveKey[:len(archiveKey)-len(ext)] + "_thumb" + ext
		archivePath := filepath.Join(s.basePath, archiveThumb)
		if _, err := os.Stat(archivePath); err == nil {
			return archivePath
		}
	}
	return ""
}
