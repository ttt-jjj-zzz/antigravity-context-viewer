# Antigravity Context Viewer (会话上下文监控扩展)

> 🛰️ 一款专为 Google Antigravity 2.0 桌面客户端打造的实时会话上下文与 Token 用量监控扩展。纯本地只读运行，零网络依赖，绝对不影响地区限制。

English | [简体中文](#简体中文)

---

## 简体中文

### 🌟 痛点与背景
在日常使用 Antigravity 进行长对话或复杂开发时，客户端默认没有直接显示“当前会话消耗了多少上下文 Token / 占模型窗口的百分比”。用户常常不知道当前上下文是否即将耗尽，或者何时该使用 `/compact` 压缩。

更关键的是：**虽然 Gemini 3.8 Flash 模型在 API 层面支持 1M 上下文，但 Antigravity 客户端底层运行时写死了约 250k（256,000 Tokens）的自动压缩线**。如果进度条按 1M 显示，当用到 230k 时只显示 23%，用户误以为还剩 77% 很安全，下一秒就会被客户端突然强制压缩！

**Antigravity Context Viewer** 完美解决了这些痛点：
* **实时常驻**：直接集成在 Antigravity 2.0 右侧边栏（`Extensions >` 菜单），左边聊天、右边实时更新。
* **双视角尺度切换**：
  - **250k 压缩线（推荐默认）**：真实反映距离客户端强制压缩还剩多少空间，提前预警；
  - **1M 物理上限**：展示 Gemini 模型的全量理论空间；
  - **200k 尺度**：适配 Claude 3.5 模型。
* **压缩次数追踪与记忆健康度预警**：从对话开启起，精准统计已经历了几次自动压缩（0次、1次、2次、3次及以上），并给出开启新对话或收尾任务的科学建议。
* **多会话自动同步**：在左侧切换不同对话时，右侧自动无缝切换并显示对应对话的真实 Token。
* **100% 本地安全**：仅只读读取本地已生成的日志文件，**不发任何外部网络请求、不修改任何系统代理或环境变量**，彻底杜绝地区限制（Region Not Supported）风险。

---

### 📸 功能预览

```
┌──────────────────────────────────────────────┐
│  🛰️ Gemini 3.8 Flash         [🔄 压缩 1 次] │
├──────────────────────────────────────────────┤
│  监控尺度: [250k 压缩线] [1M 上限] [200k]    │
│                                              │
│  70.8k / 250k                          28.3% │
│  [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] │
│                                              │
│  已用: 70,780   剩余: 179,220   已压缩: 1 次 │
│                                              │
│  🟢 已经历 1 次压缩，当前上下文状态良好      │
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
- **250k Compaction Line vs. 1M Theoretical Limit**: Antigravity runtime triggers auto-compaction around 250k tokens (0x3e800 / 256,000). The extension defaults to the 250k compaction threshold so you get accurate early warnings before context compression occurs.
- **Compaction Count & Memory Health**: Tracks how many times the conversation has been compacted since inception, advising when it's best to wrap up tasks or spawn a fresh conversation.
- **Sidecar Integration**: Runs natively in Antigravity's Auxiliary Pane via the `Extensions >` menu.
- **Dynamic Multi-Session Tracking**: Automatically switches context stats as you navigate between conversations.
- **Strictly Local & Zero Network Overhead**: Reads local disk logs (`~/.gemini/antigravity/brain/`) only. Zero external requests, zero proxy interference — completely immune to geo-restrictions.

---

## 📄 License
[MIT License](LICENSE)
