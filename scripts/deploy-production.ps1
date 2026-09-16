param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{40}$')]
    [string]$ExpectedSha,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$ExpectedVersion,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$ProductionProject = "bajetbn"
$StagingProject = "bajetbn-staging"
$ProductionBranch = "main"
$ProductionUrl = "https://bajetbn.com"

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$File,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & $File @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Command failed: $File $($Arguments -join ' ')"
    }
}

function Get-GitText {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $result = & git.exe @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($Arguments -join ' ')"
    }

    return (($result | Out-String).Trim())
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Set-Location $RepoRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " BAJETBN - CONTROLLED PRODUCTION DEPLOYMENT" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($ProductionProject -eq $StagingProject) {
    throw "STOP: Production and staging Cloudflare projects must be different."
}

$Branch = Get-GitText @("branch", "--show-current")

if ($Branch -ne $ProductionBranch) {
    throw "STOP: Production deployment can run only from main. Current branch: $Branch"
}

$Dirty = Get-GitText @("status", "--porcelain")

if ($Dirty) {
    Write-Host $Dirty
    throw "STOP: Working tree is not clean."
}

Invoke-Checked "git.exe" @("fetch", "origin", "--prune", "--tags")

$Head = Get-GitText @("rev-parse", "HEAD")
$OriginMain = Get-GitText @("rev-parse", "origin/main")
$OriginStaging = Get-GitText @("rev-parse", "origin/staging")

Write-Host "Expected SHA    :" $ExpectedSha
Write-Host "Local HEAD      :" $Head
Write-Host "origin/main     :" $OriginMain
Write-Host "origin/staging  :" $OriginStaging

if ($Head -ne $ExpectedSha) {
    throw "STOP: Local main is not the approved release SHA."
}

if ($OriginMain -ne $ExpectedSha) {
    throw "STOP: origin/main is not the approved release SHA."
}

if ($OriginStaging -ne $ExpectedSha) {
    throw "STOP: Production release must exactly match the staging-approved SHA."
}

$Package = Get-Content "package.json" -Raw | ConvertFrom-Json
$Release = Get-Content "release.json" -Raw | ConvertFrom-Json

if ($Package.version -ne $ExpectedVersion) {
    throw "STOP: package.json version does not match expected release."
}

if ($Release.version -ne $ExpectedVersion) {
    throw "STOP: release.json version does not match expected release."
}

if ($Release.label -ne "BajetBN v$ExpectedVersion") {
    throw "STOP: release.json label does not match expected release."
}

if ($Release.channel -ne "stable") {
    throw "STOP: Production release channel must be stable."
}

Write-Host ""
Write-Host "=== STRUCTURAL VERIFICATION ===" -ForegroundColor Cyan
Invoke-Checked "npm.cmd" @("run", "verify:all-structural")

Write-Host ""
Write-Host "=== v1.14.18 PERFORMANCE + MAINTENANCE VERIFICATION ===" -ForegroundColor Cyan
Invoke-Checked "npm.cmd" @("run", "verify:v11418-performance")

Write-Host ""
Write-Host "=== PRODUCTION DEPENDENCY AUDIT ===" -ForegroundColor Cyan
Invoke-Checked "npm.cmd" @("audit", "--omit=dev", "--audit-level=high")

Write-Host ""
Write-Host "=== EXPLICIT PRODUCTION BUILD ===" -ForegroundColor Cyan
Invoke-Checked "npm.cmd" @("run", "build")

Write-Host ""
Write-Host "=== BUILD OUTPUT VERIFICATION ===" -ForegroundColor Cyan
Invoke-Checked "node.exe" @("scripts/verify-build-output.mjs")
Invoke-Checked "npm.cmd" @("run", "verify:built-environment-v11417", "--", "production")

Write-Host ""
Write-Host "=== GIT DIFF SAFETY ===" -ForegroundColor Cyan
Invoke-Checked "git.exe" @("diff", "--check")

$DirtyAfterValidation = Get-GitText @("status", "--porcelain")

if ($DirtyAfterValidation) {
    Write-Host $DirtyAfterValidation
    throw "STOP: Validation changed tracked repository files."
}

$Dist = (Resolve-Path "dist").Path
$LocalManifest = Get-Content (Join-Path $Dist "precache-manifest.json") -Raw | ConvertFrom-Json

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " ALL PRODUCTION RELEASE GATES PASSED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

if ($DryRun) {
    Write-Host ""
    Write-Host "DRY RUN ONLY - Cloudflare was NOT changed." -ForegroundColor Yellow
    exit 0
}

$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("bajetbn-production-" + $ExpectedVersion)
$SiteRoot = Join-Path $TempRoot "site"

Remove-Item $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $SiteRoot -Force | Out-Null
Copy-Item (Join-Path $Dist "*") $SiteRoot -Recurse -Force

if (Test-Path (Join-Path $TempRoot "functions")) {
    throw "STOP: Isolated upload root unexpectedly contains functions."
}

if (Test-Path (Join-Path $TempRoot ".git")) {
    throw "STOP: Isolated upload root unexpectedly contains .git."
}

Write-Host ""
Write-Host "=== CLOUDFLARE DIST-ONLY DEPLOY ===" -ForegroundColor Cyan
Write-Host "Project :" $ProductionProject
Write-Host "Branch  :" $ProductionBranch
Write-Host "Artifact:" $SiteRoot

Push-Location $TempRoot

try {
    & npx.cmd `
        --yes `
        wrangler@4 `
        pages deploy `
        site `
        --project-name $ProductionProject `
        --branch $ProductionBranch `
        --commit-hash $ExpectedSha `
        --commit-message "BajetBN v$ExpectedVersion controlled production deploy" `
        --commit-dirty=false

    if ($LASTEXITCODE -ne 0) {
        throw "STOP: Cloudflare production deployment failed."
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "=== LIVE ARTIFACT VERIFICATION ===" -ForegroundColor Cyan

$LiveReady = $false

for ($Attempt = 1; $Attempt -le 30; $Attempt++) {
    Write-Host "Live verification $Attempt/30..."

    try {
        $Stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

        $LiveReleaseResponse = Invoke-WebRequest `
            -UseBasicParsing `
            -Uri ($ProductionUrl + "/release.json?verify=" + $Stamp) `
            -Headers @{ "Cache-Control" = "no-cache" }

        $LiveManifestResponse = Invoke-WebRequest `
            -UseBasicParsing `
            -Uri ($ProductionUrl + "/precache-manifest.json?verify=" + $Stamp) `
            -Headers @{ "Cache-Control" = "no-cache" }

        $LiveRelease = $LiveReleaseResponse.Content | ConvertFrom-Json
        $LiveManifest = $LiveManifestResponse.Content | ConvertFrom-Json

        if (
            $LiveRelease.version -eq $ExpectedVersion -and
            $LiveManifest.cacheName -eq $LocalManifest.cacheName
        ) {
            $LiveReady = $true
            break
        }
    }
    catch {
        # Cloudflare may still be switching the production alias.
    }

    Start-Sleep -Seconds 10
}

if (-not $LiveReady) {
    throw "STOP: Cloudflare uploaded the artifact, but the live production cache did not match the verified local build."
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " BAJETBN PRODUCTION DEPLOYMENT VERIFIED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Project          :" $ProductionProject
Write-Host "Version          :" $ExpectedVersion
Write-Host "SHA              :" $ExpectedSha
Write-Host "Live cache       :" $LiveManifest.cacheName
Write-Host "Firebase deploy  : NO"
Write-Host "Repository funcs : NOT UPLOADED"
Write-Host ""
Write-Host "NEXT: complete the live functional smoke test, then create the release tag."
