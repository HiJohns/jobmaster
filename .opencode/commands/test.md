---
description: 构建并测试后端和代理
agent: build
---
请按照 instructions.md 中的 'Build and Test' 策略执行：
1. 如果是后端修改：运行 'go test ./...' 并执行 'make build-server'，然后重启服务。
2. 如果是 Agent 修改：运行 'go test ./...' 并执行 'make build-agent'。
3. 如果是前端：检查是否有 TypeScript 编译错误或 ESLint 警告。
确保在所有测试通过前不要进行提交。
