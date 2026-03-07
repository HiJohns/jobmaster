---
description: 触发指定插件的 CI 注册流程
---
请针对指定的参数 <plugin> 执行以下流程：
1. 找到 `../utilities-base/cmd/<plugin>/main.go` 文件。
2. 对该文件进行少量无意义修改（例如添加或修改一行注释 `// CI Trigger: <timestamp>`）。
3. 在 `../utilities-base` 仓库中提交并推送这些更改，以触发 CI 注册流程。
4. 确认推送成功并告知用户 CI 已启动。
