# OPTIONAL: Run manually from BajetBN repository after reviewing upstream repos.
# Node.js, npx and Python 3.x (for UI UX Pro Max's search script) are required.
# Skills install for AI coding agents; they do not alter app runtime functionality.
$ErrorActionPreference = 'Stop'
npx ui-ux-pro-max-cli init --ai universal
if ($LASTEXITCODE -ne 0) { throw 'UI UX Pro Max setup failed' }
npx skills add https://github.com/leonxlnx/taste-skill --skill redesign-existing-projects
if ($LASTEXITCODE -ne 0) { throw 'Taste Skill setup failed' }
npx skills add https://github.com/kylezantos/design-motion-principles
if ($LASTEXITCODE -ne 0) { throw 'Motion skill setup failed' }
Write-Host 'Three coding-agent skills installed. Review AGENTS.md before UI changes.'
