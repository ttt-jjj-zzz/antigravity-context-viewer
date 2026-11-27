# Antigravity Context Viewer (会话上下文监控扩展)

> 🛰️ 一款专为 Google Antigravity 2.0 桌面客户端打造的实时会话上下文与 Token 用量监控扩展。纯本地只读运行，零网络依赖，绝对不影响地区限制。

English | [简体中文](#简体中文)

---

## 简体中文

### 🌟 痛点与背景
在日常使用 Antigravity 进行长对话或复杂开发时，客户端默认没有直接显示“当前会话消耗了多少上下文 Token / 占模型窗口的百分比”。用户常常不知道当前上下文是否即将耗尽，或者何时该使用 `/compact` 压缩。

更关键的是：不同模型与客户端版本的压缩阈值差异很大（例如 Gemini 3.8 时期常在 ~250k 压缩，而 **Gemini 4 Hydrogen / Argon / Carbon 原生支持 1M 上限**，在 Antigravity 新版中也可跑过 400k+ 而暂未触发压缩；Claude 系列则为 200k）。

**Antigravity Context Viewer** 完美解决了这些痛点：
* **实时常驻**：直接集成在 Antigravity 2.0 右侧边栏（`Extensions >` 菜单），左边聊天、右边实时更新。
* **多尺度智能匹配与切换**：
  - **1M 上限（Gemini 默认）**：对应 Gemini 4 / 3.8 系列 1M 理论总窗口，进度条 50%（500k）处带有参考刻度线；
  - **500k**：对应 Antigravity 桌面端针对 Gemini 4 翻倍后的活跃警戒刻度；
  - **200k**：自动适配 Claude 4.6 / 3.5 系列模型。
* **真实模型自动识别**：自动解析当前会话切换的最新模型（如 `Gemini 4 Hydrogen (High)`、`Claude Opus 4.6`），切到不同对话时自动匹配对应默认刻度。
* **压缩次数追踪与记忆健康度预警**：从对话开启起，精准统计已经历了几次自动压缩（0次、1次、2次、3次及以上），并给出开启新对话或收尾任务的科学建议。
* **多会话自动同步**：在左侧切换不同对话时，右侧自动无缝切换并显示对应对话的真实 Token。
* **100% 本地安全**：仅只读读取本地已生成的日志文件，**不发任何外部网络请求、不修改任何系统代理或环境变量**，彻底杜绝地区限制（Region Not Supported）风险。

---

### 📸 功能预览

```
┌──────────────────────────────────────────────┐
│  🛰️ Gemini 4 Hydrogen (High)  [🔄 记忆未压缩] │
├──────────────────────────────────────────────┤
│  上限刻度: [1M 上限] [500k] [200k]           │
│                                              │
│  436.4k / 1M                           43.6% │
│  [█████████████████░░░|░░░░░░░░░░░░░░░░░░░░] │
│                                              │
│  已用: 436,409  剩余: 563,591  已压缩: 0 次   │
│                                              │
│  🟢 空间非常充裕，记忆完整无损（未压缩）      │
└──────────────────────────────────────────────┘
```

---

### 🚀 一键安装

#### 方式一：Windows 用户（最简单）
1. 下载或克隆本项目。
2. 双击运行目录下的 **`install.bat`**。
3. 重启 Antigravity 客户端即可！

#### 方式二：手动安装
将本项目文件夹放到 `~/.gemini/config/plugins/context-viewer`，并在 `~/.gemini/config/config.json` 的 `sidecars` 字段中添加对应配置即可。

---

### 💡 如何在 Antigravity 中打开

1. 打开 Antigravity 任意对话。
2. 点击右上角菜单：**`Extensions > 会话上下文查看器`**。
3. 或者在聊天中直接使用药丸链接：
   ```markdown
   [打开上下文查看器](sidecar://context-viewer/viewer/)
   ```
4. 它会常驻在右侧面板，每 1.5 秒自动同步最新的上下文占用。

---

## English

### 🌟 Overview
Antigravity Context Viewer is a lightweight sidecar extension designed specifically for the **Google Antigravity 2.0** desktop app. It displays real-time token consumption, compaction count, and a visual progress bar.

### ✨ Key Features
- **Flexible Context Scales (`1M` / `500k` / `200k`)**: Defaults to the native `1M` limit for Gemini 4 models (with a 500k midpoint reference marker) and auto-switches to `200k` for Claude models, with one-click manual overrides.
- **Accurate Model Detection**: Automatically parses the active model selection (e.g., `Gemini 4 Hydrogen (High)`, `Claude Opus 4.6`) from explicit user settings changes.
- **Compaction Count & Memory Health**: Tracks how many times the conversation has been compacted since inception, advising when it's best to wrap up tasks or spawn a fresh conversation.
- **Sidecar Integration**: Runs natively in Antigravity's Auxiliary Pane via the `Extensions >` menu.
- **Dynamic Multi-Session Tracking**: Automatically switches context stats as you navigate between conversations.
- **Strictly Local & Zero Network Overhead**: Reads local disk logs (`~/.gemini/antigravity/brain/`) only. Zero external requests, zero proxy interference — completely immune to geo-restrictions.

---

## 📄 License
[MIT License](LICENSE)
