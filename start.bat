@echo off
title Rempart - nftables Configuration GUI
color 0A

echo.
echo   ============================================
echo     Rempart - nftables Configuration GUI
echo   ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Python non trouve. Installe Python 3.11+ depuis python.org
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js non trouve. Installe Node.js depuis nodejs.org
    pause
    exit /b 1
)

:: Install backend deps if needed
if not exist "backend\.installed" (
    echo [1/3] Installation des dependances backend...
    cd backend
    pip install -e . -q 2>nul
    if errorlevel 1 (
        echo [ERREUR] Installation backend echouee
        pause
        exit /b 1
    )
    echo OK > .installed
    cd ..
    echo       OK
) else (
    echo [1/3] Backend deja installe
)

:: Install frontend deps if needed
if not exist "frontend\node_modules" (
    echo [2/3] Installation des dependances frontend...
    cd frontend
    call npm install --silent 2>nul
    if errorlevel 1 (
        echo [ERREUR] Installation frontend echouee
        pause
        exit /b 1
    )
    cd ..
    echo       OK
) else (
    echo [2/3] Frontend deja installe
)

:: Build frontend
echo [3/3] Build du frontend...
cd frontend
call npx vite build --silent 2>nul
cd ..
echo       OK

echo.
echo   ============================================
echo     Demarrage du serveur...
echo     Mode: DEMO (donnees simulees)
echo   ============================================
echo.
echo   Ouvre ton navigateur sur:
echo.
echo     http://127.0.0.1:8443
echo.
echo   Mot de passe: admin (premier login)
echo   Ctrl+C pour arreter
echo.
echo   ============================================
echo.

:: Start backend serving the built frontend
cd backend
set REMPART_MOCK_MODE=true
python -m uvicorn rempart.main:app --host 127.0.0.1 --port 8443

pause
