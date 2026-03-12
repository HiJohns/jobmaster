.PHONY: build run test docker-up docker-down clean help

# 变量定义
APP_NAME := jobmaster
CMD_DIR := ./cmd/api
BUILD_DIR := ./build
CONFIG_FILE := config.yaml
GO := go
DOCKER_COMPOSE := docker compose

# 默认目标
.DEFAULT_GOAL := help

help: ## 显示帮助信息
	@echo "可用的命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

web: ## 编译前端资源
	@echo "正在编译前端项目..."
	@cd frontend && npm install && npm run build
	@echo "前端编译完成: ./frontend/dist"

build: ## 编译主程序
	@echo "正在编译 $(APP_NAME)..."
	@mkdir -p $(BUILD_DIR)
	$(GO) build -ldflags="-w -s" -o $(BUILD_DIR)/$(APP_NAME) $(CMD_DIR)
	@echo "编译完成: $(BUILD_DIR)/$(APP_NAME)"

run: ## 运行程序 (跳过迁移，秒开模式)
	@echo "正在启动 $(APP_NAME) (跳过迁移)..."
	@if [ ! -f $(CONFIG_FILE) ]; then \
		echo "错误: 未找到 $(CONFIG_FILE)，请复制 config.yaml.example 并配置"; \
		exit 1; \
	fi
	$(GO) run $(CMD_DIR)/main.go

dev: ## 开发模式：先迁移，再热重载
	@echo "正在以开发模式启动 (迁移 + 热重载)..."
	@$(MAKE) migrate
	@if command -v air >/dev/null 2>&1; then \
		air; \
	else \
		echo "提示: 安装 air 可实现热重载 (go install github.com/cosmtrek/air@latest)"; \
		$(GO) run $(CMD_DIR)/main.go; \
	fi

test: ## 运行所有单元测试
	@echo "正在运行单元测试..."
	$(GO) test -v ./...

test-coverage: ## 运行测试并生成覆盖率报告
	@echo "正在运行测试并生成覆盖率报告..."
	$(GO) test -coverprofile=coverage.out ./...
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "覆盖率报告已生成: coverage.html"

httptest: ## 运行 HTTP 集成测试 (Go)
	@echo "正在运行 HTTP 集成测试..."
	$(GO) test -v ./tests/httptest/...

pytest: ## 运行 Python 集成测试
	@echo "正在运行 Python 集成测试..."
	@if [ ! -d "tests/pytest" ]; then \
		echo "错误: tests/pytest 目录不存在"; \
		exit 1; \
	fi
	@cd tests/pytest && \
	if [ ! -f "venv/bin/activate" ]; then \
		echo "创建 Python 虚拟环境..."; \
		python3 -m venv venv; \
	fi && \
	. venv/bin/activate && \
	pip install -q -r requirements.txt && \
	pytest -v

grand-tour: ## 运行全链路集成测试 (Grand Tour)
	@echo "========================================="
	@echo "  运行全链路集成测试 (Grand Tour)"
	@echo "========================================="
	@echo ""
	@echo "步骤:"
	@echo "  1. 检查后端服务状态"
	@echo "  2. 初始化五方角色账号"
	@echo "  3. 执行工单全生命周期测试"
	@echo "  4. 生成测试报告"
	@echo ""
	@# Check if backend is running
	@echo "检查后端服务..."
	@curl -s http://localhost:5555/health > /dev/null 2>&1 || (echo "错误: 后端服务未运行，请先执行 'make run'"; exit 1)
	@echo "后端服务已就绪"
	@echo ""
	@cd tests/pytest && \
	if [ ! -f "venv/bin/activate" ]; then \
		echo "创建 Python 虚拟环境..."; \
		python3 -m venv venv; \
	fi && \
	. venv/bin/activate && \
	pip install -q -r requirements.txt && \
	echo "运行 Grand Tour 测试..." && \
	pytest test_grand_tour.py -v --tb=short 2>&1 | tee tour_report.txt && \
	echo "" && \
	echo "=========================================" && \
	echo "  测试报告已生成: tests/pytest/tour_report.txt" && \
	echo "========================================="

check: ## 提交前检查：运行所有测试和代码检查
	@echo "========================================="
	@echo "  运行提交前全面检查"
	@echo "========================================="
	@echo ""
	@echo "1. 运行 Go 单元测试..."
	$(GO) test ./... || exit 1
	@echo ""
	@echo "2. 运行 HTTP 集成测试..."
	$(GO) test ./tests/httptest/... || exit 1
	@echo ""
	@echo "3. 运行 Python 集成测试..."
	$(MAKE) pytest || exit 1
	@echo ""
	@echo "4. 运行代码格式化检查..."
	$(GO) fmt ./...
	@echo ""
	@echo "========================================="
	@echo "  ✅ 所有检查通过！"
	@echo "========================================="

docker-up: ## 启动开发环境 Docker 容器 (PostgreSQL)
	@echo "正在启动开发环境容器..."
	$(DOCKER_COMPOSE) up -d
	@echo "等待 PostgreSQL 启动..."
	@sleep 3
	@echo "开发环境已启动"
	@echo "数据库连接: postgresql://jobmaster:***@localhost:5432/jobmaster"

docker-down: ## 停止开发环境 Docker 容器
	@echo "正在停止开发环境容器..."
	$(DOCKER_COMPOSE) down

docker-clean: ## 停止并清理开发环境 (包括数据卷)
	@echo "正在清理开发环境..."
	$(DOCKER_COMPOSE) down -v --remove-orphans
	@echo "开发环境已清理"

migrate: ## 运行数据库迁移 (--migrate flag)
	@echo "正在执行数据库迁移..."
	$(GO) run $(CMD_DIR)/main.go --migrate

seed: ## 运行数据库种子
	@echo "正在执行数据库种子..."
	$(GO) run $(CMD_DIR)/main.go seed

lint: ## 运行代码检查
	@echo "正在运行 golangci-lint..."
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run ./...; \
	else \
		echo "提示: 安装 golangci-lint (https://golangci-lint.run/usage/install/)"; \
	fi

fmt: ## 格式化代码
	@echo "正在格式化代码..."
	$(GO) fmt ./...

clean: ## 清理构建产物
	@echo "正在清理构建产物..."
	@rm -rf $(BUILD_DIR) coverage.out coverage.html
	@echo "清理完成"

install-deps: ## 安装依赖工具
	@echo "正在安装依赖..."
	$(GO) mod download
	$(GO) mod tidy

build-linux: ## 编译 Linux 版本
	@echo "正在编译 Linux 版本..."
	@mkdir -p $(BUILD_DIR)
	GOOS=linux GOARCH=amd64 $(GO) build -ldflags="-w -s" -o $(BUILD_DIR)/$(APP_NAME)-linux-amd64 $(CMD_DIR)
	@echo "编译完成: $(BUILD_DIR)/$(APP_NAME)-linux-amd64"

build-mac: ## 编译 macOS 版本
	@echo "正在编译 macOS 版本..."
	@mkdir -p $(BUILD_DIR)
	GOOS=darwin GOARCH=amd64 $(GO) build -ldflags="-w -s" -o $(BUILD_DIR)/$(APP_NAME)-darwin-amd64 $(CMD_DIR)
	@echo "编译完成: $(BUILD_DIR)/$(APP_NAME)-darwin-amd64"
