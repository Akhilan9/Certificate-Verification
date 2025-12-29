@echo off
start "Backend Server" cmd /k "cd backend && uvicorn main:app --reload --port 8001"
start "Frontend Server" cmd /k "cd frontend && npm run dev"
echo Servers started in separate windows...
