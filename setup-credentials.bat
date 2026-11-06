@echo off
echo ==========================================
echo   CREDENTIAL SETUP HELPER
echo ==========================================
echo.
echo This script will help you set up Firebase credentials securely.
echo.
echo IMPORTANT: The serviceAccountKey.json file was removed from the repository
echo for security reasons. You need to restore it from your backup or generate
echo a new one from Firebase Console.
echo.
echo ==========================================
echo   OPTIONS
echo ==========================================
echo.
echo 1. I have a backup of serviceAccountKey.json
echo 2. I need to generate a new key from Firebase Console
echo 3. I already have it in a secure location
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" goto option1
if "%choice%"=="2" goto option2
if "%choice%"=="3" goto option3
echo Invalid choice
goto end

:option1
echo.
echo Please copy your serviceAccountKey.json file to the backend directory:
echo Copy to: backend\serviceAccountKey.json
echo.
pause
goto setup_env

:option2
echo.
echo Opening Firebase Console in your browser...
echo.
echo Follow these steps:
echo 1. Go to Project Settings ^> Service Accounts
echo 2. Click "Generate New Private Key"
echo 3. Save the JSON file as serviceAccountKey.json
echo 4. Place it in the backend directory
echo.
start https://console.firebase.google.com/
echo.
pause
goto setup_env

:option3
echo.
echo Please update the backend\.env file with the path to your service account key:
echo.
echo Example: FIREBASE_SERVICE_ACCOUNT_PATH=C:\secure\location\serviceAccountKey.json
echo.
pause
goto setup_env

:setup_env
echo.
echo ==========================================
echo   ENVIRONMENT FILE SETUP
echo ==========================================
echo.
echo Creating backend\.env file from template...
if not exist backend\.env.example (
    echo ERROR: backend\.env.example not found
    goto end
)
copy backend\.env.example backend\.env
echo.
echo Created backend\.env file
echo.
echo Please edit backend\.env and configure your Firebase credentials
echo.
echo Creating frontend\.env file from template...
if not exist frontend\.env.example (
    echo ERROR: frontend\.env.example not found
    goto end
)
copy frontend\.env.example frontend\.env
echo.
echo Created frontend\.env file
echo.
echo Please edit frontend\.env and configure your Firebase client credentials
echo.
echo ==========================================
echo   NEXT STEPS
echo ==========================================
echo.
echo 1. Edit backend\.env with your Firebase credentials
echo 2. Edit frontend\.env with your Firebase client credentials
echo 3. Install new dependencies: cd backend and venv\Scripts\activate and pip install python-dotenv pydantic
echo 4. Test the application
echo.
echo IMPORTANT: Configure Firestore security rules in Firebase Console
echo See firestore-security-rules.firestore for the rules
echo.
pause

:end
echo.
echo Setup helper complete. Please follow the instructions above.
