# 🏋️ AI Gym Posture Detection

**Real-Time Exercise Posture Detection and Injury Risk Reduction Using Computer Vision**

> **Sharda University - Sharda School of Computing Science and Engineering**  
> **PBL-2 (CSP-297) - Semester 4th Term- 2502**

**Team 4:**
- Vansh Bhardwaj (2024182457) - Computer Vision & Backend Development
- Sehran Fayaz (2024121805) - Frontend Development & System Integration

---

## 🎯 Project Overview

Incorrect exercise posture is a major cause of injuries during gym and home workouts, particularly among beginners who lack real-time guidance. This project presents a real-time exercise posture detection system using computer vision techniques to assist users in performing exercises safely.

**Key Innovation:** Combines lightweight pose estimation with joint angle analysis and rule-based posture assessment to deliver immediate, explainable feedback with injury risk alerts.

---

## 🚀 Features

### Core Features
- ✅ **Real-time pose detection** using MediaPipe (33 body landmarks)
- ✅ **6 Exercise Support:** Squat, Deadlift, Bicep Curl, Shoulder Press, Push-up, Lunge
- ✅ **Automatic rep counting** with state machine logic
- ✅ **Posture validation** with exercise-specific rules
- ✅ **Injury risk detection** and alerts
- ✅ **Live skeleton overlay** on video feed
- ✅ **Real-time visual feedback** (Green/Red indicators)
- ✅ **WebSocket support** for instant updates

### Dashboard Features
- 📊 **Session statistics** (accuracy, duration, injury alerts)
- 📈 **Rep tracking** (correct vs wrong form)
- 📜 **Workout history** with session summaries
- 🔔 **Posture issue history**
- 🎨 **Modern glassmorphism UI** with Tailwind CSS
- 📱 **Responsive design** for all screen sizes

### Cloud Integration
- ☁️ **Firebase Firestore** for data persistence
- 🔄 **Real-time sync** between backend and frontend
- 📝 **Session logging** with timestamps
- 📊 **Historical analytics**

---

## 🧠 Tech Stack

### Backend
- **Python 3.11+**
- **FastAPI** - Modern web framework
- **MediaPipe** - Pose estimation (33 landmarks)
- **OpenCV** - Video processing
- **Firebase Admin SDK** - Cloud database
- **WebSockets** - Real-time communication

### Frontend
- **React 19**
- **Tailwind CSS 3.4** - Modern styling
- **Firebase Client SDK** - Real-time database
- **Lucide React** - Icons
- **Recharts** - Analytics (optional)

### Cloud
- **Firebase Firestore** - NoSQL database
- **Google Cloud Platform**

---

## 📁 Project Structure

```
AI_POWERED_GYM_POSTURE_DETECTION-New/
├── backend/
│   ├── main.py                 # Main FastAPI server (NEW)
│   ├── control_server.py       # Legacy server (kept for reference)
│   ├── requirements.txt        # Python dependencies
│   ├── serviceAccountKey.json  # Firebase credentials (not in repo)
│   └── pose_landmarker_lite.task  # MediaPipe model
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main React application (NEW)
│   │   ├── index.css          # Tailwind styles (NEW)
│   │   ├── firebase/
│   │   │   └── config.js      # Firebase configuration
│   │   └── ...
│   ├── package.json           # Node dependencies (updated)
│   ├── tailwind.config.js     # Tailwind configuration (NEW)
│   └── postcss.config.js      # PostCSS configuration
├── run/
│   ├── run_backend.bat        # Backend launcher
│   └── run_frontend.bat       # Frontend launcher
└── README.md                  # This file
```

---

## 🔒 SECURITY SETUP

### ⚠️ Critical Security Requirements

**IMPORTANT:** Firebase service account credentials must never be committed to version control. If you have previously committed `serviceAccountKey.json`, you must immediately rotate/revoked these credentials in the Firebase/Google Cloud Console.

### Environment Variables Configuration

#### Backend Environment Setup

1. **Create backend environment file:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Configure Firebase credentials (choose ONE method):**

   **Option 1: Service Account JSON String (Recommended for Production)**
   ```env
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}
   ```
   - Get your service account JSON from Firebase Console > Project Settings > Service Accounts
   - Copy the entire JSON content as a single-line string
   - Paste it as the value for FIREBASE_SERVICE_ACCOUNT

   **Option 2: Service Account File Path (For Local Development)**
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your/serviceAccountKey.json
   ```
   - Keep your service account JSON file outside the repository
   - Set the full path to the file
   - Ensure this file is in your .gitignore

3. **Configure CORS (optional):**
   ```env
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

#### Frontend Environment Setup

1. **Create frontend environment file:**
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. **Configure Firebase client credentials:**
   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

   Get these values from Firebase Console > Project Settings > General > Your apps

3. **Configure backend URLs (optional):**
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8000
   REACT_APP_WS_URL=ws://localhost:8000
   ```

### Firebase Security Rules

The project includes Firestore security rules in `firestore-security-rules.firestore`. These rules should be configured in Firebase Console:

1. Go to Firebase Console > Firestore Database > Rules
2. Copy the contents of `firestore-security-rules.firestore`
3. Paste into the rules editor
4. Click "Publish"

**Current Status:** Rules allow public access for development. When authentication is implemented, update the rules to use the user-specific collections pattern.

### Required Manual Actions

1. **Firebase Service Account Key:**
   - Git history analysis confirmed the service account key was **NOT** previously committed to version control
   - The project now uses a placeholder file (`serviceAccountKey.json.placeholder`) for immediate functionality
   - **RECOMMENDED:** Replace the placeholder credentials with your own Firebase credentials for security
   - Generate new service account keys from Firebase Console for production use

2. **Configure Firestore Security Rules:**
   - Apply the provided security rules from `firestore-security-rules.firestore`
   - Update them when authentication is implemented

3. **Set Environment Variables:**
   - Run `setup-credentials.bat` helper script OR manually create `.env` files
   - Never commit `.env` files to version control
   - Use `.env.example` as templates

### .gitignore Configuration

The project includes comprehensive `.gitignore` files to prevent accidental commits of:
- Environment files (.env, .env.local, etc.)
- Firebase credentials (serviceAccountKey.json)
- Sensitive configuration files
- Build artifacts and dependencies

---

## 🎬 How to Run (Local)

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher
- Webcam/camera access
- Firebase project with Firestore enabled
- Environment variables configured (see Security Setup above)

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment (if not exists)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your Firebase credentials

# Run backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Or simply run:**
```bash
npm run backend
```

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Firebase client credentials

# Run development server
npm start
```

**Or simply run:**
```bash
npm run frontend
```

### 3. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/status` | GET | Get current system status |
| `/start` | POST | Start AI detection |
| `/stop` | POST | Stop AI detection & save session |
| `/reset` | POST | Reset rep counters |
| `/video` | GET | MJPEG video stream |
| `/ws` | WS | WebSocket for real-time updates |
| `/history` | GET | Get posture history |
| `/sessions` | GET | Get session summaries |

---

## 🎥 Demo Flow (for judges)

1. **Start Backend:** Run `run_backend.bat`
2. **Start Frontend:** Run `run_frontend.bat`
3. **Open Dashboard:** Navigate to http://localhost:3000
4. **Start Detection:** Click "Start AI Detection"
5. **Perform Exercise:**
   - Correct posture → Green indicator
   - Wrong posture → Red indicator with feedback
6. **View Stats:** Check rep counter and accuracy
7. **View History:** Click "View History" for past sessions
8. **Stop Detection:** Click "Stop AI Detection"
9. **Check Firebase:** View `sessions` and `postureHistory` collections

---

## 🏋️ Supported Exercises & Form Rules

### Squat
- **Correct:** Knee angle 65°-110°, torso lean < 50°, knees aligned with toes
- **Wrong:** Too shallow (>110°), too deep (<50°), excessive forward lean, knee valgus

### Deadlift
- **Correct:** Knees relatively straight (>120°), hip hinge 25°-70°
- **Wrong:** Too much knee bend, insufficient hip hinge, back rounding

### Bicep Curl
- **Correct:** Elbows tucked at sides, controlled movement
- **Wrong:** Elbows lifted, swinging, incomplete range of motion

### Shoulder Press
- **Correct:** Full overhead extension, upright torso
- **Wrong:** Insufficient overhead press, excessive back lean, uneven press

### Push-up
- **Correct:** Body straight, controlled descent
- **Wrong:** Sagging hips, piked hips, improper elbow angle

### Lunge
- **Correct:** Front knee over ankle, upright torso
- **Wrong:** Knee past toes, insufficient depth, torso tilt

---

## ☁️ Firebase Data Structure

### Collections

**`postureLogs/latest`** - Current live state
```json
{
  "exercise": "Squat",
  "status": "correct",
  "issue": "Good form!",
  "rep_count": 12,
  "timestamp": "server_timestamp",
  "angles": { "left_knee": 95, "right_knee": 98 },
  "feedback": ["Keep chest up"]
}
```

**`postureHistory`** - Wrong posture events
```json
{
  "exercise": "Squat",
  "status": "wrong",
  "issue": "Back leaning too much",
  "timestamp": "server_timestamp",
  "session_id": "20250118_143022"
}
```

**`sessions`** - Session summaries
```json
{
  "session_id": "20250118_143022",
  "start_time": "2025-01-18T14:30:22",
  "exercise_type": "Squat",
  "total_reps": 15,
  "correct_reps": 12,
  "wrong_reps": 3,
  "duration_seconds": 180,
  "injury_alerts": 2
}
```

---

## 🔧 Architecture Improvements (v2.0)

### Backend Improvements
- ✅ Modular architecture with separate classes for classification, validation, rep counting
- ✅ Fixed duplicate Firebase write bug
- ✅ Added WebSocket support for real-time updates
- ✅ Added 2 new exercises (Push-up, Lunge)
- ✅ Improved rep counting with confidence-based state machine
- ✅ Added session management with automatic summary saving
- ✅ Better error handling and logging

### Frontend Improvements
- ✅ Completely redesigned UI with Tailwind CSS
- ✅ Glassmorphism design system
- ✅ Real-time stats with accuracy calculation
- ✅ Session timer
- ✅ Workout history view
- ✅ Responsive layout
- ✅ WebSocket connection status indicator

---

## 📚 References

1. Z. Cao et al., "OpenPose: Realtime multi-person 2D pose estimation using part affinity fields," CVPR 2017.
2. C. Lugaresi et al., "MediaPipe: A framework for building perception pipelines," arXiv:1906.08172, 2019.
3. X. Chen et al., "Vision-based human exercise evaluation for human–computer interaction," IEEE Access 2020.
4. G. Suciu et al., "Automatic fitness exercise recognition using deep learning," Sensors 2019.
5. A. Sharma and R. Kumar, "Computer vision-based injury prevention systems: A review," Journal of Healthcare Engineering 2021.

---

## 📄 License

This project is developed for academic purposes at Sharda University.

---

## 🤝 Team

- **AI / Computer Vision:** Vansh Bhardwaj (2024182457)
- **Frontend & System Integration:** Sehran Fayaz (2024121805)
- **Institution:** Sharda University - Sharda School of Computing Science and Engineering
- **Project:** PBL-2 (CSP-297) - Semester 4th Term- 2502

---

**Last Updated:** March 2026
