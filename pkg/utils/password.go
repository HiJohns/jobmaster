package utils

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"regexp"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

// IsStrongPassword checks if a password meets security requirements
// Requirements: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
func IsStrongPassword(password string) bool {
	var (
		hasMinLen  = false
		hasUpper   = false
		hasLower   = false
		hasDigit   = false
		hasSpecial = false
	)

	if len(password) >= 8 {
		hasMinLen = true
	}

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	// If password contains at least 3 of 4 requirements (excluding min length)
	requirementCount := 0
	if hasUpper {
		requirementCount++
	}
	if hasLower {
		requirementCount++
	}
	if hasDigit {
		requirementCount++
	}
	if hasSpecial {
		requirementCount++
	}

	return hasMinLen && requirementCount >= 3
}

// ValidatePassword checks password strength and returns detailed feedback
func ValidatePassword(password string) (isValid bool, feedback []string) {
	feedback = []string{}

	if len(password) < 8 {
		feedback = append(feedback, "密码长度至少8个字符")
	}

	hasUpper := false
	hasLower := false
	hasDigit := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		feedback = append(feedback, "必须包含至少1个大写字母")
	}
	if !hasLower {
		feedback = append(feedback, "必须包含至少1个小写字母")
	}
	if !hasDigit {
		feedback = append(feedback, "必须包含至少1个数字")
	}
	if !hasSpecial {
		feedback = append(feedback, "必须包含至少1个特殊字符")
	}

	requirementCount := 0
	if hasUpper {
		requirementCount++
	}
	if hasLower {
		requirementCount++
	}
	if hasDigit {
		requirementCount++
	}
	if hasSpecial {
		requirementCount++
	}

	isValid = len(password) >= 8 && requirementCount >= 3
	return isValid, feedback
}

// HashPassword generates a bcrypt hash from a plaintext password
func HashPassword(password string) (string, error) {
	if !IsStrongPassword(password) {
		return "", fmt.Errorf("password does not meet security requirements")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}

	return string(hashedPassword), nil
}

// CheckPasswordHash compares a hashed password with its possible plaintext equivalent
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// PasswordStrengthScore calculates a strength score for a password (0-100)
func PasswordStrengthScore(password string) int {
	score := 0

	// Length bonus
	if len(password) >= 8 {
		score += 20
	}
	if len(password) >= 12 {
		score += 20
	}
	if len(password) >= 16 {
		score += 20
	}

	// Character variety bonus
	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if hasUpper {
		score += 10
	}
	if hasLower {
		score += 10
	}
	if hasDigit {
		score += 10
	}
	if hasSpecial {
		score += 10
	}

	// Penalty for common patterns
	commonPatterns := []string{"123", "abc", "qwe", "password", "admin"}
	for _, pattern := range commonPatterns {
		if matched, _ := regexp.MatchString(pattern, password); matched {
			score -= 20
		}
	}

	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	return score
}

// GenerateRandomPassword generates a random password of specified length
func GenerateRandomPassword(length int) string {
	const (
		lowerChars   = "abcdefghijklmnopqrstuvwxyz"
		upperChars   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
		digitChars   = "0123456789"
		specialChars = "!@#$%^&*"
		allChars     = lowerChars + upperChars + digitChars + specialChars
	)

	result := make([]byte, length)
	for i := 0; i < length; i++ {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(allChars))))
		result[i] = allChars[n.Int64()]
	}
	return string(result)
}
