# Antigravity Context Viewer (会话上下文监控扩展)

> 🛰️ 一款专为 Google Antigravity 2.0 桌面客户端打造的实时会话上下文与 Token 用量监控扩展。纯本地只读运行，零网络依赖，绝对不影响地区限制。

English | [简体中文](#简体中文)

---

## 简体中文

### 🌟 痛点与背景
在日常使用 Antigravity 进行长对话或复杂开发时，客户端默认没有直接显示“当前会话消耗了多少上下文 Token / 占模型窗口的百分比”。用户常常不知道当前上下文是否即将耗尽，或者何时该使用 `/compact` 压缩。

**Antigravity Context Viewer** 填补了这一空白：
* **实时常驻**：直接集成在 Antigravity 2.0 右侧边栏（`Extensions >` 菜单），左边聊天、右边实时更新。
* **极简仪表盘**：只显示最核心指标——总容量（如 1M）、已用 Token 数量、剩余空间与平滑彩色进度条。
* **多会话自动同步**：在左侧切换不同对话时，右侧自动无缝切换并显示对应对话的真实 Token。
* **100% 本地安全**：仅只读读取本地已生成的日志文件，**不发任何外部网络请求、不修改任何系统代理或环境变量**，彻底杜绝地区限制（Region Not Supported）风险。

---

### 📸 功能预览

```
┌──────────────────────────────────────────────┐
│  🛰️ Gemini 3.8 Flash           [1M 容量] 200k│
├──────────────────────────────────────────────┤
│  231.4k / 1M                           23.1% │
│                                              │
│  [██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] │
│                                              │
│  已用: 231,431 Tokens   剩余: 768,569 (76.9%) │
│                                              │
│  🟢 空间非常充裕，记忆完整无损                │
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
Antigravity Context Viewer is a lightweight sidecar extension designed specifically for the **Google Antigravity 2.0** desktop app. It displays real-time token consumption, current context usage, and a visual progress bar indicating how much of the model's context window (e.g., 1M) is utilized.

### ✨ Key Features
- **Minimalist & Clean**: Displays only essential metrics — total window size (1M/200k), used tokens, remaining tokens, and a colored progress bar.
- **Sidecar Integration**: Runs natively in Antigravity's Auxiliary Pane via the `Extensions >` menu.
- **Dynamic Multi-Session Tracking**: Automatically switches context stats as you navigate between conversations.
- **Strictly Local & Zero Network Overhead**: Reads local disk logs (`~/.gemini/antigravity/brain/`) only. Zero external requests, zero tampering with proxies or environment variables — completely immune to geo-restriction errors.

### 🚀 Quick Start
Run `install.bat` on Windows, or execute `install.ps1`. Then restart Antigravity, and find **`会话上下文查看器 (Context Viewer)`** under `Extensions >`.

---

## 📄 License
[MIT License](LICENSE)
