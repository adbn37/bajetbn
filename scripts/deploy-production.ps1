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
$StagingProject    = "bajetbn-staging"
$ProductionBranch = "main"

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

$RepoRoot =
    (Resolve-Path (
        Join-Path $PSScriptRoot ".."
    )).Path

Set-Location $RepoRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " BAJETBN - GUARDED PRODUCTION DEPLOYMENT" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------
# Guard 1: Fixed project separation
# ------------------------------------------------------------

if ($ProductionProject -eq $StagingProject) {
    throw "STOP: Production and staging Cloudflare projects must be different."
}

Write-Host "Production project : $ProductionProject"
Write-Host "Staging project    : $StagingProject"

# ------------------------------------------------------------
# Guard 2: Must run only from main
# ------------------------------------------------------------

$Branch = Get-GitText @(
    "branch",
    "--show-current"
)

if ($Branch -ne $ProductionBranch) {
    throw "STOP: Production deployment can run only from main. Current branch: $Branch"
}

# ------------------------------------------------------------
# Guard 3: Working tree must be clean
# ------------------------------------------------------------

$Dirty = Get-GitText @(
    "status",
    "--porcelain"
)

if ($Dirty) {
    Write-Host $Dirty
    throw "STOP: Working tree is not clean."
}

# ------------------------------------------------------------
# Guard 4: Refresh remote lineage
# ------------------------------------------------------------

Invoke-Checked "git.exe" @(
    "fetch",
    "origin",
    "--prune",
    "--tags"
)

$Head = Get-GitText @(
    "rev-parse",
    "HEAD"
)

$OriginMain = Get-GitText @(
    "rev-parse",
    "origin/main"
)

$OriginStaging = Get-GitText @(
    "rev-parse",
    "origin/staging"
)

Write-Host ""
Write-Host "Expected SHA :" $ExpectedSha
Write-Host "Local HEAD   :" $Head
Write-Host "origin/main  :" $OriginMain
Write-Host "origin/staging:" $OriginStaging

if ($Head -ne $ExpectedSha) {
    throw "STOP: Local main is not the approved release SHA."
}

if ($OriginMain -ne $ExpectedSha) {
    throw "STOP: origin/main is not the approved release SHA."
}

if ($OriginStaging -ne $ExpectedSha) {
    throw "STOP: Production release must exactly match the staging-approved SHA."
}

# ------------------------------------------------------------
# Guard 5: Exact release tag
# ------------------------------------------------------------

$TagName = "v$ExpectedVersion"
$TagRef  = "refs/tags/$TagName^{commit}"

$TagSha = Get-GitText @(
    "rev-parse",
    $TagRef
)

if ($TagSha -ne $ExpectedSha) {
    throw "STOP: $TagName does not point to the approved release SHA."
}

Write-Host "Release tag    :" $TagName
Write-Host "Release tag SHA:" $TagSha

# ------------------------------------------------------------
# Guard 6: Exact release metadata
# ------------------------------------------------------------

$Package =
    Get-Content "package.json" -Raw |
    ConvertFrom-Json

$Release =
    Get-Content "release.json" -Raw |
    ConvertFrom-Json

if ($Package.version -ne $ExpectedVersion) {
    throw "STOP: package.json version does not match expected release."
}

if ($Release.version -ne $ExpectedVersion) {
    throw "STOP: release.json version does not match expected release."
}

if ($Release.label -ne "BajetBN v$ExpectedVersion") {
    throw "STOP: release.json label does not match the expected release."
}

if ($Release.channel -ne "stable") {
    throw "STOP: Production release channel must be stable."
}

if (-not $Release.releasedAt) {
    throw "STOP: release.json releasedAt is missing."
}

Write-Host ""
Write-Host "Version metadata : PASS" -ForegroundColor Green

# ------------------------------------------------------------
# Guard 7: Full application verification
# ------------------------------------------------------------

Write-Host ""
Write-Host "=== FULL STRUCTURAL VERIFICATION ===" -ForegroundColor Cyan

Invoke-Checked "npm.cmd" @(
    "run",
    "verify:all-structural"
)

Write-Host ""
Write-Host "=== PRODUCTION DEPENDENCY AUDIT ===" -ForegroundColor Cyan

Invoke-Checked "npm.cmd" @(
    "audit",
    "--omit=dev",
    "--audit-level=high"
)

Write-Host ""
Write-Host "=== PRODUCTION BUILD ===" -ForegroundColor Cyan

Invoke-Checked "npm.cmd" @(
    "run",
    "build",
    "--",
    "--mode",
    "production"
)

Write-Host ""
Write-Host "=== BUILD OUTPUT VERIFICATION ===" -ForegroundColor Cyan

Invoke-Checked "node.exe" @(
    "scripts/verify-build-output.mjs"
)

Write-Host ""
Write-Host "=== GIT DIFF SAFETY ===" -ForegroundColor Cyan

Invoke-Checked "git.exe" @(
    "diff",
    "--check"
)

$DirtyAfterValidation = Get-GitText @(
    "status",
    "--porcelain"
)

if ($DirtyAfterValidation) {
    Write-Host $DirtyAfterValidation
    throw "STOP: Validation changed tracked repository files."
}

$Dist =
    (Resolve-Path "dist").Path

if (-not (Test-Path (
    Join-Path $Dist "index.html"
))) {
    throw "STOP: dist/index.html does not exist."
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " ALL PRODUCTION RELEASE GATES PASSED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

# ------------------------------------------------------------
# Dry-run escape
# ------------------------------------------------------------

if ($DryRun) {
    Write-Host ""
    Write-Host "DRY RUN ONLY - Cloudflare was NOT changed." -ForegroundColor Yellow
    exit 0
}

# ------------------------------------------------------------
# Guard 8: Cloudflare credentials must be explicit
# ------------------------------------------------------------

if (-not $env:CLOUDFLARE_API_TOKEN) {
    throw "STOP: CLOUDFLARE_API_TOKEN is not set."
}

if (-not $env:CLOUDFLARE_ACCOUNT_ID) {
    throw "STOP: CLOUDFLARE_ACCOUNT_ID is not set."
}

# ------------------------------------------------------------
# Guard 9:
# Run Wrangler OUTSIDE the repository.
#
# This prevents Wrangler from seeing:
#
#   BajetBN/functions/
#
# as Cloudflare Pages Functions.
# Only the already-verified dist directory is supplied.
# ------------------------------------------------------------

$DeployWorkingDirectory =
    Join-Path `
        ([System.IO.Path]::GetTempPath()) `
        "bajetbn-cloudflare-production"

New-Item `
    -ItemType Directory `
    -Path $DeployWorkingDirectory `
    -Force |
    Out-Null

Write-Host ""
Write-Host "Cloudflare working directory:"
Write-Host "  $DeployWorkingDirectory"

Write-Host ""
Write-Host "Artifact:"
Write-Host "  $Dist"

Write-Host ""
Write-Host "Target:"
Write-Host "  $ProductionProject / $ProductionBranch"

Push-Location $DeployWorkingDirectory

try {
    & npx.cmd `
        --yes `
        wrangler@4 `
        pages deploy `
        $Dist `
        --project-name $ProductionProject `
        --branch $ProductionBranch `
        --commit-hash $ExpectedSha `
        --commit-message "BajetBN v$ExpectedVersion" `
        --commit-dirty=false

    if ($LASTEXITCODE -ne 0) {
        throw "STOP: Cloudflare production deployment failed."
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " BAJETBN PRODUCTION DEPLOYMENT COMPLETED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Project :" $ProductionProject
Write-Host "Branch  :" $ProductionBranch
Write-Host "Version :" $ExpectedVersion
Write-Host "SHA     :" $ExpectedSha