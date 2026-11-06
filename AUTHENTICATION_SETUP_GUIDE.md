# AUTHENTICATION + USER PROFILE SYSTEM - SETUP GUIDE

## IMMEDIATE SETUP REQUIRED

### 1. Enable Firebase Authentication

**CRITICAL:** You must enable Email/Password authentication in Firebase Console for the login/register to work.

**Steps:**
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: **gym-posture-monitoring**
3. Go to **Authentication** > **Sign-in method**
4. Click on **Email/Password**
5. Click **Enable**
6. Click **Save**

### 2. Update Firestore Security Rules

Apply the updated security rules that now support user-specific collections:

1. Go to Firebase Console > Firestore Database > Rules
2. Copy the contents of `firestore-security-rules.firestore`
3. Paste into the rules editor
4. Click **Publish**

### 3. Restart the Application

**Important:** The frontend needs to be restarted to load the new authentication components.

**Option 1 - Manual Restart:**
1. Stop the current frontend process (Ctrl+C in the terminal running npm start)
2. Restart: `cd frontend && npm start`

**Option 2 - Use Different Port:**
1. Stop current frontend
2. Run: `cd frontend && PORT=3001 npm start`
3. Access at: http://localhost:3001

### 4. Test the Authentication Flow

**First Run - Registration:**
1. Open http://localhost:3000 (or 3001)
2. You should see the Login page
3. Click "Create Account"
4. Fill in: Name, Email, Password, Confirm Password
5. Click "Create Account"
6. Complete the profile setup (or skip)
7. You should now see the dashboard with your user info

**Subsequent Runs - Login:**
1. Refresh the page
2. You should stay logged in (Firebase session persistence)
3. Click "Logout" in the user menu
4. You should be redirected to login page
5. Login with your credentials

### 5. Verify Features

**After Login:**
- Dashboard shows your name and fitness goal
- User menu in header with avatar
- Click "Start AI Detection" to test existing features
- Verify camera, MediaPipe, exercise detection still work
- Check that workout history appears (user-specific)

**Profile Completion:**
- If you skipped profile setup, you can access it later via Settings
- Profile includes: age, gender, height, weight, fitness level, fitness goal
- BMI is calculated automatically

## TROUBLESHOOTING

### Login/Register Not Working:
- **Check:** Did you enable Email/Password authentication in Firebase Console?
- **Check:** Are your Firebase environment variables correct?
- **Check:** Is the internet connection working (Firebase requires internet)?

### Profile Setup Not Appearing:
- This is normal if you already have profile data
- Profile setup only shows for new registrations with incomplete profiles

### Firebase Errors:
- **"auth/user-not-found"** - Email doesn't exist, register first
- **"auth/wrong-password"** - Incorrect password
- **"auth/email-already-in-use"** - Email already registered, login instead
- **"auth/operation-not-allowed"** - Email/Password auth not enabled in Firebase Console

### Backend Not Working:
- Ensure backend is still running on port 8000
- Check that backend/main.py has environment variables configured
- Verify Firebase Admin credentials are correctly set

## FEATURE VERIFICATION CHECKLIST

### Authentication:
- [ ] Login page displays correctly
- [ ] Register page displays correctly
- [ ] Email validation works
- [ ] Password validation works
- [ ] Registration creates user in Firebase Auth
- [ ] Registration creates profile in Firestore
- [ ] Login with correct credentials works
- [ ] Login with wrong credentials shows error
- [ ] Logout works
- [ ] Session persists on refresh
- [ ] Session clears on logout

### Profile:
- [ ] Profile setup displays after registration
- [ ] Profile form accepts all fields
- [ ] Profile updates save to Firestore
- [ ] Skip option works
- [ ] BMI calculation works
- [ ] Display name updates with BMI

### Dashboard:
- [ ] Dashboard shows user name
- [ ] Dashboard shows fitness goal
- [ ] Dashboard shows fitness level
- [ ] User menu displays with avatar
- [ ] User menu dropdown works
- [ ] Profile button in menu
- [ ] Settings button in menu
- [ ] Logout button in menu

### AI Features (After Login):
- [ ] Start AI Detection button works
- [ ] Camera feed displays
- [ ] Exercise detection works
- [ ] Posture validation works
- [ ] Rep counting works
- [ ] WebSocket connection works
- [ ] Real-time feedback works
- [ ] Firebase writes work (user-specific)

## DATA STRUCTURE

### User Profile Document:
```
users/{uid}
├── uid: string
├── name: string
├── email: string
├── age: number (optional)
├── gender: string (optional)
├── height: number (optional)
├── weight: number (optional)
├── fitnessLevel: string
├── fitnessGoal: string
├── createdAt: string (ISO timestamp)
└── updatedAt: string (ISO timestamp)
```

### User-Specific Collections:
```
users/{uid}/sessions/{sessionId}
users/{uid}/postureHistory/{eventId}
```

### Legacy Collections (Backward Compatible):
```
postureLogs/latest
postureHistory
sessions
```

## NEXT STEPS

After authentication is working:

1. **Test thoroughly** with multiple users
2. **Verify data isolation** - check that users only see their own data
3. **Consider migrating** legacy data to user-specific structure
4. **Plan additional features** - settings, profile editing, etc.

---

**AUTHENTICATION SYSTEM READY FOR TESTING**

Once you complete the Firebase Console setup and restart the frontend, the authentication system will be fully functional.
