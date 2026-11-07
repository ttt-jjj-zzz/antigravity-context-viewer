---
name: context-viewer
description: 实时监控和展示 Antigravity 对话上下文用量、Token 统计、Thinking 思考链与每轮工具执行轨迹。当用户询问“上下文”、“Token”、“历史用量”、“为什么看不到上下文”时激活。
---

# 会话上下文监控技能

当用户询问当前会话的上下文、Token 消耗或想看完整历史记录时：

1. 读取当前会话的 `transcript_full.jsonl`：
   - 路径：`~/.gemini/antigravity/brain/<当前会话ID>/.system_generated/logs/transcript_full.jsonl`
2. 统计当前最新步骤的 `input_tokens`、`cache_read_tokens`、`output_tokens` 及步骤总数。
3. 创建或更新 `context_dashboard.md` 工件（设置 `ArtifactMetadata: { UserFacing: true }`），使看板自动固定在用户右侧面板。
4. 指引用户可以直接在右侧面板查看实时刷新内容，或双击打开本地静态看板。
