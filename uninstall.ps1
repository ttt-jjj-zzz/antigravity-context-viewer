# Antigravity Context Viewer 自动卸载脚本

$ErrorActionPreference = "SilentlyContinue"

Write-Host "正在卸载 Antigravity 上下文查看器..." -ForegroundColor Yellow

$userHome = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::UserProfile)
$targetPluginDir = Join-Path $userHome ".gemini\config\plugins\context-viewer"
$configFile = Join-Path $userHome ".gemini\config\config.json"
$projFile = Join-Path $userHome ".gemini\config\projects\65d0ba0d-09a1-432e-a46c-25569abde5f3.json"

if (Test-Path $targetPluginDir) {
    Remove-Item -Path $targetPluginDir -Recurse -Force
}
if (Test-Path $projFile) {
    Remove-Item -Path $projFile -Force
}

if (Test-Path $configFile) {
    try {
        $raw = Get-Content -Path $configFile -Raw -Encoding UTF8
        $cfg = $raw | ConvertFrom-Json -AsHashtable
        if ($cfg.plugins) { $cfg.plugins.Remove("context-viewer") }
        if ($cfg.sidecars) { $cfg.sidecars.Remove("context-viewer/viewer") }
        $updated = $cfg | ConvertTo-Json -Depth 10
        [System.IO.File]::WriteAllText($configFile, $updated, [System.Text.Encoding]::UTF8)
    } catch {}
}

Write-Host "已成功卸载！" -ForegroundColor Green
