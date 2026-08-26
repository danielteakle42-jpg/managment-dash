@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing the website...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
echo Starting Platinum Pulse x VOID Creator Hub...
call npm run dev
pause
