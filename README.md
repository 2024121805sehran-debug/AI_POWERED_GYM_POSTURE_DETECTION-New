\# 🏋️ AI Powered Gym Posture Detection



AI-powered real-time gym posture detection system that uses computer vision to detect body landmarks, identify exercises, and classify posture as \*\*Correct/Wrong\*\* with injury-risk feedback. The system streams a skeleton-overlay camera feed to a web dashboard and logs posture events in Firebase Firestore.



---



\## 🚀 Features

\- Live pose detection with \*\*MediaPipe Pose\*\* (33 landmarks)

\- Real-time posture status: ✅ Correct / ❌ Wrong

\- Auto exercise detection:

&nbsp; - Squat

&nbsp; - Deadlift

&nbsp; - Bicep Curl

&nbsp; - Shoulder Press

\- Live skeleton camera stream inside the frontend

\- Injury risk warnings (rule-based)

\- Firebase Firestore integration:

&nbsp; - `postureLogs/latest` for live state

&nbsp; - `postureHistory` for wrong-posture logs with timestamps

\- React dashboard with Start/Stop AI Detection



---



\## 🧠 Tech Stack

\*\*Backend:\*\* Python, OpenCV, MediaPipe, FastAPI, Firebase Admin SDK  

\*\*Frontend:\*\* React.js  

\*\*Cloud:\*\* Firebase Firestore (Google Cloud)



---



\## 🏗️ Project Structure

AI\_POWERED\_GYM\_POSTURE\_DETECTION-New/

backend/ # FastAPI + MediaPipe + Firebase

frontend/ # React dashboard

README.md





---



\## ▶️ How to Run (Local)



\### 1) Backend Setup

1\. Open terminal inside `backend/`

2\. Create and activate venv:

&nbsp;  - `python -m venv venv`

&nbsp;  - `venv\\\\Scripts\\\\activate`

3\. Install dependencies:

&nbsp;  - `pip install mediapipe==0.10.9 opencv-python numpy firebase-admin fastapi uvicorn`

4\. Add Firebase service key:

&nbsp;  - Place `serviceAccountKey.json` inside `backend/`

5\. Run backend:

&nbsp;  - `uvicorn control\_server:app --host 0.0.0.0 --port 8000`



\### 2) Frontend Setup

1\. Open terminal inside `frontend/`

2\. Install and run:

&nbsp;  - `npm install`

&nbsp;  - `npm start`



---



\## 🎥 Demo Flow (for judges)

1\. Start backend server

2\. Start frontend

3\. Open dashboard → click \*\*Start AI Detection\*\*

4\. Perform an exercise:

&nbsp;  - Correct posture → green

&nbsp;  - Wrong posture → red + issue

5\. Click \*\*Stop AI Detection\*\*

6\. Check Firebase Firestore logs for history proof



---



\## ☁️ Firebase Data

\- Live state: `postureLogs/latest`

\- Logs: `postureHistory` (timestamped)



---



\## 👥 Team

\- AI / CV: MediaPipe + posture logic  

\- Backend: FastAPI + Firebase  

\- Frontend: React dashboard

