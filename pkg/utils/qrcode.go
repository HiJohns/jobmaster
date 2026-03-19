package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

type QRCodeGenerator struct {
	secretKey []byte
}

func NewQRCodeGenerator(secretKey string) *QRCodeGenerator {
	if len(secretKey) < 32 {
		secretKey = fmt.Sprintf("%-32s", secretKey)
	}
	return &QRCodeGenerator{
		secretKey: []byte(secretKey)[:32],
	}
}

func (g *QRCodeGenerator) GenerateToken(deviceID uuid.UUID) (string, time.Time, error) {
	expiresAt := time.Now().Add(365 * 24 * time.Hour)
	token := fmt.Sprintf("%s:%d", deviceID.String(), expiresAt.Unix())

	encrypted, err := g.encrypt(token)
	if err != nil {
		return "", time.Time{}, err
	}

	return base64.URLEncoding.EncodeToString(encrypted), expiresAt, nil
}

func (g *QRCodeGenerator) ValidateToken(token string) (uuid.UUID, error) {
	decoded, err := base64.URLEncoding.DecodeString(token)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid token format: %w", err)
	}

	decrypted, err := g.decrypt(decoded)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to decrypt token: %w", err)
	}

	parts := strings.Split(string(decrypted), ":")
	if len(parts) != 2 {
		return uuid.Nil, fmt.Errorf("invalid token structure")
	}

	expiresUnix, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid expiration in token: %w", err)
	}

	if time.Now().Unix() > expiresUnix {
		return uuid.Nil, fmt.Errorf("token expired")
	}

	deviceID, err := uuid.Parse(parts[0])
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid device ID in token: %w", err)
	}

	return deviceID, nil
}

func (g *QRCodeGenerator) GenerateQRURL(baseURL string, deviceID uuid.UUID) (string, error) {
	token, _, err := g.GenerateToken(deviceID)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s/scan?token=%s", strings.TrimSuffix(baseURL, "/"), token), nil
}

func (g *QRCodeGenerator) encrypt(plaintext string) ([]byte, error) {
	block, err := aes.NewCipher(g.secretKey)
	if err != nil {
		return nil, err
	}

	ciphertext := make([]byte, aes.BlockSize+len(plaintext))
	iv := ciphertext[:aes.BlockSize]
	if _, err := rand.Read(iv); err != nil {
		return nil, err
	}

	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[aes.BlockSize:], []byte(plaintext))

	return ciphertext, nil
}

func (g *QRCodeGenerator) decrypt(ciphertext []byte) ([]byte, error) {
	block, err := aes.NewCipher(g.secretKey)
	if err != nil {
		return nil, err
	}

	if len(ciphertext) < aes.BlockSize {
		return nil, fmt.Errorf("ciphertext too short")
	}

	iv := ciphertext[:aes.BlockSize]
	ciphertext = ciphertext[aes.BlockSize:]

	stream := cipher.NewCFBDecrypter(block, iv)
	stream.XORKeyStream(ciphertext, ciphertext)

	return ciphertext, nil
}

func GenerateRandomToken(length int) string {
	bytes := make([]byte, length)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
