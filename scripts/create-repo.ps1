param(
  [string]$RepoName = "teams-bot-aks-poc",
  [string]$Description = "POC for Teams bot HTTP 500 and ECONNRESET diagnostics on AKS."
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI is required. Install gh and run gh auth login."
}

gh auth status
if (-not (Test-Path ".git")) {
  git init
}
git add .
if (git status --short) {
  git commit -m "Initial Teams bot AKS failure POC" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
}
gh repo create $RepoName --private --source . --remote origin --description $Description --push
