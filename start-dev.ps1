# Air Drive — Start Development Servers
# Run from the project root: .\start-dev.ps1

Write-Host "🚀 Starting Air Drive Development Servers..." -ForegroundColor Cyan

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; Write-Host '🟢 Backend starting...' -ForegroundColor Green; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; Write-Host '🔵 Frontend starting...' -ForegroundColor Blue; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ Servers launched in separate windows" -ForegroundColor Green
Write-Host "   Backend → http://localhost:5000" -ForegroundColor Yellow
Write-Host "   Frontend → http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Remember to fill in backend\.env with your credentials!" -ForegroundColor Magenta
