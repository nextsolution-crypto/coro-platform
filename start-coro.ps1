# ============================================================
# CORO — Script de démarrage complet
# Lance le backend NestJS, le frontend Next.js, et LanguageTool
# chacun dans sa propre fenêtre PowerShell
# ============================================================

Write-Host "Démarrage de CORO..." -ForegroundColor Cyan

# ── Chemins à ajuster si nécessaire ──
$backendPath      = "F:\coro-platform\coro-backend"
$frontendPath     = "F:\coro-platform\coro-frontend"
$languageToolPath = "F:\LanguageTool-6.6"
$javaPath         = "C:\Program Files\Java\jdk-17\bin\java.exe"

# ── 1. Backend NestJS ──
Write-Host "Lancement du backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run start:dev"

Start-Sleep -Seconds 2

# ── 2. Frontend Next.js ──
Write-Host "Lancement du frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev"

Start-Sleep -Seconds 2

# ── 3. LanguageTool (correcteur orthographique) ──
Write-Host "Lancement de LanguageTool..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$languageToolPath'; & '$javaPath' -cp languagetool-server.jar org.languagetool.server.HTTPServer --port 8081 --allow-origin '*'"

Write-Host ""
Write-Host "Tous les services sont en cours de démarrage dans des fenêtres séparées." -ForegroundColor Green
Write-Host "Backend     : http://localhost:3002" -ForegroundColor Green
Write-Host "Frontend    : http://localhost:3000" -ForegroundColor Green
Write-Host "LanguageTool: http://localhost:8081" -ForegroundColor Green
Write-Host ""
Write-Host "Attends quelques secondes que tout démarre, puis ouvre http://localhost:3000" -ForegroundColor Cyan
