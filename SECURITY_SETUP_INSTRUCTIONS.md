# SECURITY SETUP INSTRUCTIONS

## ⚠️ CRITICAL SECURITY ACTIONS REQUIRED

### 1. Backend Environment Setup

The backend requires Firebase credentials. Run the setup helper:

```bash
setup-credentials.bat
```

Or manually create `backend/.env` file:

```env
# Firebase Admin SDK Configuration
# The project includes a placeholder file with the original credentials
# IMPORTANT: Replace these with your own Firebase credentials for security
FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json.placeholder

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**SECURITY NOTE:** The `serviceAccountKey.json.placeholder` file contains the original Firebase credentials for immediate functionality. **You must replace these with your own credentials:**

1. Go to Firebase Console > Project Settings > Service Accounts
2. Generate a new service account key
3. Replace the contents of `serviceAccountKey.json.placeholder` with your new credentials
4. Or better: Use the FIREBASE_SERVICE_ACCOUNT environment variable with JSON content

### 2. Frontend Environment Setup

Create `frontend/.env` file (manually or via setup helper):

```env
# Firebase Client Configuration
# IMPORTANT: Replace these with your actual Firebase credentials
REACT_APP_FIREBASE_API_KEY=AIzaSyCBr7sDrXV9-qBRbywqoTKkRWX3tIDsOF0
REACT_APP_FIREBASE_AUTH_DOMAIN=gym-posture-monitoring.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=gym-posture-monitoring
REACT_APP_FIREBASE_STORAGE_BUCKET=gym-posture-monitoring.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=1051844221099
REACT_APP_FIREBASE_APP_ID=1:1051844221099:web:7801782b59865080507fee
REACT_APP_FIREBASE_MEASUREMENT_ID=G-DY7JZN8HSG

# Backend API Configuration
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```

### 3. Firebase Security Actions

**CRITICAL:** Firebase credentials must be secured:

1. **IMMEDIATE:** The original Firebase service account key was removed from the repository for security
2. **REQUIRED:** Replace the placeholder credentials with your own Firebase credentials
3. **RECOMMENDED:** Generate new service account keys from Firebase Console for production use
4. **Configure Firestore Security Rules** (see below)

### 4. Enable Firebase Authentication

**REQUIRED:** Enable Email/Password authentication in Firebase Console:

1. Go to Firebase Console > Authentication > Sign-in method
2. Click on **Email/Password**
3. Enable the sign-in provider
4. Click **Save**

This is required for the login/register functionality to work.

**Note:** Git history check confirmed the service account key was not previously committed to version control.

### 4. Install New Dependencies

The backend now requires additional dependencies:

```bash
cd backend
venv\Scripts\activate
pip install python-dotenv pydantic
```

### 5. Configure Firestore Security Rules

Apply the provided security rules:

1. Go to Firebase Console > Firestore Database > Rules
2. Copy the contents of `firestore-security-rules.firestore`
3. Paste into the rules editor
4. Click "Publish"

**Current Status:** Rules allow public access for development. Update when authentication is implemented.

### 6. Verify Setup

Test the environment configuration:

```bash
# Test backend environment loading
cd backend
venv\Scripts\activate
python -c "from dotenv import load_dotenv; load_dotenv(); import os; print('Env loaded:', bool(os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')))"
```

## SECURITY BEST PRACTICES

1. **Never commit .env files** - They are now in .gitignore
2. **Never commit service account keys** - They are now in .gitignore
3. **Use environment variables** for all sensitive configuration
4. **Rotate credentials** if they were ever exposed
5. **Update security rules** when implementing authentication
6. **Use CORS restrictions** instead of wildcard access
7. **Validate input** on all API endpoints
8. **Never log credentials** or sensitive information

## PRODUCTION DEPLOYMENT

For production deployment:

1. Use secrets management (AWS Secrets Manager, Google Secret Manager, etc.)
2. Use Firebase service account JSON string in environment variables
3. Configure strict CORS rules for your production domain
4. Implement proper authentication and authorization
5. Use Firestore security rules with user-based access control
6. Enable Firebase App Check if applicable
7. Implement rate limiting and abuse prevention
