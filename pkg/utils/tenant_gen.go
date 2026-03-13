package utils

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"regexp"
	"strings"

	"github.com/mozillazg/go-pinyin"
)

// TenantCodeBlacklist 租户代码黑名单 - 防止路由冲突和系统混淆
var TenantCodeBlacklist = []string{
	// 系统保留词
	"admin", "administrator", "system", "sys", "root", "auth", "api", "v1", "v2",
	// 业务冲突词
	"tenant", "organization", "workorder", "job", "master", "user", "role", "permission",
	// Web 敏感词
	"www", "static", "assets", "public", "login", "logout", "dashboard",
}

// blacklistedCodes 黑名单快速查找表
var blacklistedCodes map[string]bool

func init() {
	blacklistedCodes = make(map[string]bool)
	for _, code := range TenantCodeBlacklist {
		blacklistedCodes[code] = true
	}
}

// IsBlacklistedCode 检查代码是否在黑名单中
func IsBlacklistedCode(code string) bool {
	return blacklistedCodes[strings.ToLower(code)]
}

// GenerateTenantCode 根据租户名称生成唯一标识码
// 步骤：
// 1. 转换为全小写拼音
// 2. 清洗特殊字符（保留字母数字）
// 3. 检查黑名单
// 4. 返回清洗后的代码
func GenerateTenantCode(name string) (string, error) {
	if name == "" {
		return "", fmt.Errorf("tenant name cannot be empty")
	}

	// 转换为拼音（全小写，不带声调）
	pinyinArgs := pinyin.NewArgs()
	pinyinArgs.Style = pinyin.NORMAL // 不带声调
	pinyinArgs.Heteronym = false     // 单音字模式

	pySlice := pinyin.Pinyin(name, pinyinArgs)

	// 将拼音切片拼接为字符串，用下划线连接
	var pinyinParts []string
	for _, part := range pySlice {
		if len(part) > 0 {
			pinyinParts = append(pinyinParts, strings.ToLower(part[0]))
		}
	}

	if len(pinyinParts) == 0 {
		// 如果名称不包含中文字符，直接使用原名称
		pinyinParts = append(pinyinParts, strings.ToLower(name))
	}

	code := strings.Join(pinyinParts, "_")

	// 清洗：保留字母和数字，其他字符转为下划线
	code = sanitizeCode(code)

	// 检查黑名单
	if IsBlacklistedCode(code) {
		// 强制追加随机后缀
		suffix, err := generateRandomSuffix(4)
		if err != nil {
			return "", fmt.Errorf("failed to generate random suffix: %w", err)
		}
		code = fmt.Sprintf("%s_%s", code, suffix)
	}

	// 确保不以数字开头（避免某些系统限制）
	if len(code) > 0 {
		matched, _ := regexp.MatchString(`^[0-9]`, code)
		if matched {
			code = "t_" + code
		}
	}

	// 限制最大长度（避免数据库字段限制）
	if len(code) > 100 {
		code = code[:100]
	}

	return code, nil
}

var (
	nonAlphaNumRegex     = regexp.MustCompile(`[^a-zA-Z0-9]+`)
	multiUnderscoreRegex = regexp.MustCompile(`_+`)
)

// sanitizeCode 清洗代码：保留字母数字，其他转为下划线
func sanitizeCode(code string) string {
	// 替换非字母数字字符为下划线
	code = nonAlphaNumRegex.ReplaceAllString(code, "_")

	// 移除连续的下划线
	code = multiUnderscoreRegex.ReplaceAllString(code, "_")

	// 移除首尾下划线
	code = strings.Trim(code, "_")

	return code
}

// generateRandomSuffix 生成随机数字后缀
func generateRandomSuffix(length int) (string, error) {
	max := big.NewInt(10000) // 0-9999
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}

	format := fmt.Sprintf("%%0%dd", length)
	return fmt.Sprintf(format, n.Int64()), nil
}

// GenerateTenantSlug 生成租户 Slug（全拼，无下划线）
// 用于 URL、子域名等场景
func GenerateTenantSlug(name string) (string, error) {
	if name == "" {
		return "", fmt.Errorf("tenant name cannot be empty")
	}

	// 转换为拼音（全小写，不带声调）
	pinyinArgs := pinyin.NewArgs()
	pinyinArgs.Style = pinyin.NORMAL
	pinyinArgs.Heteronym = false

	pySlice := pinyin.Pinyin(name, pinyinArgs)

	// 将拼音切片拼接为字符串，直接连接（无下划线）
	var pinyinParts []string
	for _, part := range pySlice {
		if len(part) > 0 {
			pinyinParts = append(pinyinParts, strings.ToLower(part[0]))
		}
	}

	if len(pinyinParts) == 0 {
		// 如果名称不包含中文字符，直接使用原名称
		pinyinParts = append(pinyinParts, strings.ToLower(name))
	}

	slug := strings.Join(pinyinParts, "")

	// 清洗：移除非字母数字字符
	slug = sanitizeSlug(slug)

	// 检查黑名单
	if IsBlacklistedCode(slug) {
		// 强制追加随机后缀
		suffix, err := generateRandomSuffix(4)
		if err != nil {
			return "", fmt.Errorf("failed to generate random suffix: %w", err)
		}
		slug = fmt.Sprintf("%s%s", slug, suffix)
	}

	// 限制最大长度
	if len(slug) > 100 {
		slug = slug[:100]
	}

	return slug, nil
}

// sanitizeSlug 清洗 Slug：仅保留字母数字
func sanitizeSlug(slug string) string {
	// 替换非字母数字字符为空字符串
	re := regexp.MustCompile(`[^a-zA-Z0-9]+`)
	slug = re.ReplaceAllString(slug, "")
	return slug
}

// GenerateUniqueTenantSlug 生成唯一的租户 Slug（带防碰撞）
func GenerateUniqueTenantSlug(name string, slugExists func(string) (bool, error)) (string, error) {
	baseSlug, err := GenerateTenantSlug(name)
	if err != nil {
		return "", err
	}

	slug := baseSlug
	attempts := 0
	maxAttempts := 100

	// 防碰撞循环
	for attempts < maxAttempts {
		exists, err := slugExists(slug)
		if err != nil {
			return "", fmt.Errorf("failed to check slug existence: %w", err)
		}
		if !exists {
			break
		}

		attempts++
		suffix, err := generateRandomSuffix(4)
		if err != nil {
			return "", fmt.Errorf("failed to generate random suffix: %w", err)
		}
		slug = fmt.Sprintf("%s%s", baseSlug, suffix)

		// 限制最大长度
		if len(slug) > 100 {
			slug = slug[:96] + suffix
		}
	}

	if attempts >= maxAttempts {
		return "", fmt.Errorf("unable to generate unique slug after %d attempts", maxAttempts)
	}

	return slug, nil
}

// GenerateUniqueTenantCode 生成唯一的租户代码（带防碰撞）
// codeExists 是一个检查代码是否已存在的函数
func GenerateUniqueTenantCode(name string, codeExists func(string) (bool, error)) (string, error) {
	baseCode, err := GenerateTenantCode(name)
	if err != nil {
		return "", err
	}

	code := baseCode
	attempts := 0
	maxAttempts := 100

	// 防碰撞循环
	for attempts < maxAttempts {
		exists, err := codeExists(code)
		if err != nil {
			return "", fmt.Errorf("failed to check code existence: %w", err)
		}
		if !exists {
			break
		}

		attempts++
		suffix, err := generateRandomSuffix(4)
		if err != nil {
			return "", fmt.Errorf("failed to generate random suffix: %w", err)
		}
		code = fmt.Sprintf("%s_%s", baseCode, suffix)

		// 限制最大长度
		if len(code) > 100 {
			code = code[:96] + "_" + suffix
		}
	}

	if attempts >= maxAttempts {
		return "", fmt.Errorf("unable to generate unique code after %d attempts", maxAttempts)
	}

	return code, nil
}
