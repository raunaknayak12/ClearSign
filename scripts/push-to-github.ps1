# Push ClearSign to GitHub (run after `gh auth login`)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

# Verify no secrets staged
$tracked = git ls-files | Select-String -Pattern "^backend/\.env$|^frontend/\.env\.local$|gsk_[A-Za-z0-9]{20,}"
if ($tracked) {
    Write-Error "Secrets detected in tracked files. Aborting push."
    exit 1
}

gh repo create ClearSign --public --source=. --remote=origin --push --description "AI-powered legal document clause analysis"
Write-Host "Repository created and pushed."
