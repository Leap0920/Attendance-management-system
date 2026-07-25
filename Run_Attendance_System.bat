@echo off
SETLOCAL EnableDelayedExpansion
TITLE Attendance Management System - Auto Launcher
COLOR 0A

:: Smart IP Detection
set "MYIP=localhost"
echo [1/4] Detecting Network IP...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "tempip=%%a"
    set "tempip=!tempip: =!"
    if "!tempip:~0,3!"=="192" set "MYIP=!tempip!"
    if "!tempip:~0,3!"=="10." set "MYIP=!tempip!"
    if "!tempip:~0,3!"=="172" set "MYIP=!tempip!"
)

cls
echo.
echo   [94m########################################################## [0m
echo   [94m# [0m                                                         [94m# [0m
echo   [94m# [0m   [97mATTENDANCE MANAGEMENT SYSTEM - AUTO START [0m            [94m# [0m
echo   [94m# [0m                                                         [94m# [0m
echo   [94m########################################################## [0m
echo.
echo   [95mDetected IP: !MYIP! [0m
echo.

:: Step 1: Start Backend
echo   [92m[2/4] [0m Launching Backend...
start "Backend - Spring Boot" cmd /k "echo Initializing Maven... && cd /d %~dp0backend && .\mvnw.cmd spring-boot:run"

:: Wait a bit for backend to initialize
echo   [93m[WAIT] [0m Waiting for backend to spin up...
timeout /t 5 /nobreak > nul

:: Step 2: Start Frontend
echo   [92m[3/4] [0m Launching Frontend...
start "Frontend - Vite" cmd /k "echo Initializing Vite... && cd /d %~dp0frontend && npm run dev"

echo.
echo   [92m[4/4] [0m Opening dashboard at http://!MYIP!:8138 in 5 seconds...
timeout /t 5 /nobreak > nul
start http://!MYIP!:8138

exit
