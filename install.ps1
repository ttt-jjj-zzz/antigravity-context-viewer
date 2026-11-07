# Antigravity Context Viewer 自动安装脚本
# 适用于 Windows / macOS / Linux

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " 🛰️ 正在安装 Antigravity 上下文查看器插件..." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$userHome = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::UserProfile)
$geminiConfigDir = Join-Path $userHome ".gemini\config"
$pluginsDir = Join-Path $geminiConfigDir "plugins"
$targetPluginDir = Join-Path $pluginsDir "context-viewer"
$configFile = Join-Path $geminiConfigDir "config.json"
$projectsDir = Join-Path $geminiConfigDir "projects"

# 1. 检查目录
if (-not (Test-Path $geminiConfigDir)) {
    New-Item -ItemType Directory -Force -Path $geminiConfigDir | Out-Null
}
if (-not (Test-Path $pluginsDir)) {
    New-Item -ItemType Directory -Force -Path $pluginsDir | Out-Null
}
if (-not (Test-Path $projectsDir)) {
    New-Item -ItemType Directory -Force -Path $projectsDir | Out-Null
}

# 2. 复制插件文件
Write-Host "• 正在部署插件文件到: $targetPluginDir"
$currentDir = $PSScriptRoot
if (-not (Test-Path $targetPluginDir)) {
    New-Item -ItemType Directory -Force -Path $targetPluginDir | Out-Null
}

Copy-Item -Path (Join-Path $currentDir "plugin.json") -Destination $targetPluginDir -Force
Copy-Item -Path (Join-Path $currentDir "sidecars") -Destination $targetPluginDir -Recurse -Force
Copy-Item -Path (Join-Path $currentDir "skills") -Destination $targetPluginDir -Recurse -Force

# 3. 注册到 config.json
Write-Host "• 正在注册 Sidecar UI 扩展到 config.json..."
$projectId = "65d0ba0d-09a1-432e-a46c-25569abde5f3"

$cfg = @{}
if (Test-Path $configFile) {
    try {
        $raw = Get-Content -Path $configFile -Raw -Encoding UTF8
        if ($raw.Trim()) {
            $cfg = $raw | ConvertFrom-Json -AsHashtable
        }
    } catch {
        $cfg = @{}
    }
}

if (-not $cfg.ContainsKey("plugins")) {
    $cfg["plugins"] = @{}
}
$cfg["plugins"]["context-viewer"] = @{
    "installedFrom" = @{
        "id" = "local/plugin/context-viewer"
        "marketplace" = "local"
        "version" = "1.0.0"
    }
}

if (-not $cfg.ContainsKey("sidecars")) {
    $cfg["sidecars"] = @{}
}
$cfg["sidecars"]["context-viewer/viewer"] = @{
    "projectId" = $projectId
    "schemaVersion" = 1
}

$updatedJson = $cfg | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($configFile, $updatedJson, [System.Text.Encoding]::UTF8)

# 4. 创建 project 配置
$projFile = Join-Path $projectsDir "$projectId.json"
if (-not (Test-Path $projFile)) {
    $projContent = @"
{
  "id": "$projectId",
  "name": "context-viewer/viewer",
  "projectResources": {},
  "permissionGrants": {
    "permissionGrants": {},
    "v2Migrated": true
  },
  "settings": {
    "artifactReviewMode": "ARTIFACT_REVIEW_MODE_TURBO"
  }
}
"@
    [System.IO.File]::WriteAllText($projFile, $projContent, [System.Text.Encoding]::UTF8)
}

Write-Host "=============================================" -ForegroundColor Green
Write-Host " ✅ 安装成功！" -ForegroundColor Green
Write-Host " 请重启 Antigravity 软件，在对话右侧菜单:" -ForegroundColor Yellow
Write-Host "   👉 点击 Extensions > 会话上下文查看器" -ForegroundColor Yellow
Write-Host " 即可在侧边栏常驻看到实时上下文用量与进度条！" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Green
