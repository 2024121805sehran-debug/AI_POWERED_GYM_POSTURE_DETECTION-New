"""
AI Gym Posture Detection - Backend
Real-time exercise posture detection and injury risk reduction using computer vision.

Team: Vansh Bhardwaj (2024182457), Sehran Fayaz (2024121805)
Institution: Sharda University - Sharda School of Computing Science and Engineering
Project: PBL-2 (CSP-297) - Semester 4th Term- 2502
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
import threading
import time
import cv2
import mediapipe as mp
import numpy as np
import math
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import firebase_admin
from firebase_admin import credentials, firestore
import asyncio
from concurrent.futures import ThreadPoolExecutor
import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator

# ==================== CONFIGURATION ====================

class ExerciseType(Enum):
    SQUAT = "Squat"
    DEADLIFT = "Deadlift"
    BICEP_CURL = "Bicep Curl"
    SHOULDER_PRESS = "Shoulder Press"
    PUSHUP = "Push-up"
    LUNGE = "Lunge"
    BENCH_PRESS = "Bench Press"  # Consolidated with Chest Press
    TRICEP_CURL = "Tricep Curl"
    TRICEP_EXTENSION = "Tricep Extension"
    LATERAL_RAISE = "Lateral Raise"
    FRONT_RAISE = "Front Raise"
    PULLUP = "Pullup"
    UNKNOWN = "Unknown"

class PostureStatus(Enum):
    CORRECT = "correct"
    WRONG = "wrong"

@dataclass
class PostureData:
    exercise: str
    status: str
    issue: str
    rep_count: int
    session_id: str
    timestamp: str
    angles: Dict[str, float]
    feedback: List[str]

@dataclass
class SessionData:
    session_id: str
    start_time: str
    exercise_type: str
    total_reps: int
    correct_reps: int
    wrong_reps: int
    duration_seconds: int
    injury_alerts: int

# ==================== API MODELS FOR VALIDATION ====================

class WorkoutPlanRequest(BaseModel):
    goal: str = Field(..., description="Workout goal: strength, fat_loss, mobility")
    level: str = Field(default="beginner", description="Experience level: beginner, intermediate, advanced")

    @field_validator('goal')
    @classmethod
    def validate_goal(cls, v):
        allowed_goals = ['strength', 'fat_loss', 'mobility']
        if v.lower() not in allowed_goals:
            raise ValueError(f"Goal must be one of: {', '.join(allowed_goals)}")
        return v.lower()

    @field_validator('level')
    @classmethod
    def validate_level(cls, v):
        allowed_levels = ['beginner', 'intermediate', 'advanced']
        if v.lower() not in allowed_levels:
            raise ValueError(f"Level must be one of: {', '.join(allowed_levels)}")
        return v.lower()

# ==================== FIREBASE SETUP ====================

# Load environment variables from .env file
load_dotenv()

# Initialize Firebase Admin SDK with service account from environment
# The service account JSON content should be provided as a string in FIREBASE_SERVICE_ACCOUNT env var
# or as a file path in FIREBASE_SERVICE_ACCOUNT_PATH env var
firebase_service_account = os.getenv("FIREBASE_SERVICE_ACCOUNT")
firebase_service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")

if firebase_service_account:
    # Use service account content from environment variable
    try:
        import json
        service_account_dict = json.loads(firebase_service_account)
        cred = credentials.Certificate(service_account_dict)
    except json.JSONDecodeError:
        raise ValueError("FIREBASE_SERVICE_ACCOUNT environment variable contains invalid JSON")
elif firebase_service_account_path:
    # Use service account file from environment variable path
    if not os.path.exists(firebase_service_account_path):
        raise FileNotFoundError(f"Service account file not found at {firebase_service_account_path}")
    cred = credentials.Certificate(firebase_service_account_path)
else:
    raise RuntimeError(
        "Firebase credentials not configured. Set either FIREBASE_SERVICE_ACCOUNT "
        "(JSON content) or FIREBASE_SERVICE_ACCOUNT_PATH (file path) environment variable."
    )

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

# ==================== GEOMETRY HELPERS ====================

def calculate_angle(a: Tuple[float, float], b: Tuple[float, float], c: Tuple[float, float]) -> float:
    """Calculate angle ABC in degrees."""
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    c = np.array(c, dtype=np.float32)
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    cosine = np.clip(cosine, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosine)))

def calculate_vertical_angle(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Calculate angle relative to vertical (0 = vertical)."""
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    angle = abs(math.degrees(math.atan2(dx, dy)))
    return angle

def get_landmark_point(lm, landmark_idx) -> Tuple[float, float]:
    """Get (x, y) coordinates from MediaPipe landmark."""
    return (lm[landmark_idx].x, lm[landmark_idx].y)

def calculate_midpoint(p1: Tuple[float, float], p2: Tuple[float, float]) -> Tuple[float, float]:
    """Calculate midpoint between two points."""
    return ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)

# ==================== EXERCISE CONFIGURATION ====================

# Centralized exercise configuration with biomechanical thresholds
# All thresholds are based on biomechanics literature and can be tuned
EXERCISE_CONFIG = {
    "Squat": {
        "primary_angles": ["left_knee", "right_knee", "left_hip", "right_hip"],
        "secondary_angles": ["torso_lean"],
        "rom_knee": (70, 110),  # Optimal knee angle range
        "rom_hip": (80, 110),   # Optimal hip angle range
        "max_torso_lean": 45,   # Maximum acceptable torso lean
        "knee_valgus_threshold": 0.72,  # Knee width as % of hip width
        "injury_conditions": {
            "knee_too_deep": 55,  # Below this angle = butt wink risk
            "back_rounding": 68,  # Torso lean threshold
        }
    },
    "Deadlift": {
        "primary_angles": ["left_knee", "right_knee", "torso_lean"],
        "secondary_angles": ["left_hip", "right_hip"],
        "rom_knee": (150, 170),  # Knees should stay mostly straight
        "rom_torso_lean": (30, 70),  # Hip hinge range
        "max_torso_lean": 68,   # Maximum safe back angle
        "min_torso_lean": 22,   # Minimum for proper hinge
        "hip_symmetry_threshold": 18,  # Max hip angle difference
    },
    "Bicep Curl": {
        "primary_angles": ["left_elbow", "right_elbow"],
        "secondary_angles": ["torso_lean"],
        "rom_elbow": (30, 160),  # Full ROM for bicep activation
        "max_elbow_drift": 0.04,  # Elbow shouldn't rise above shoulder
        "max_lateral_drift": 0.14,  # Elbow shouldn't swing outward
        "over_curl_threshold": 0.06,  # Wrist shouldn't go above shoulder
    },
    "Shoulder Press": {
        "primary_angles": ["left_elbow", "right_elbow"],
        "secondary_angles": ["torso_lean"],
        "rom_elbow_lockout": (148, 180),  # Lockout at top
        "min_press_height": 0.04,  # Wrists must be above shoulders
        "max_torso_lean": 18,  # Maximum back arch
        "asymmetry_threshold": 0.10,  # Max height difference between arms
    },
    "Pushup": {
        "primary_angles": ["left_elbow", "right_elbow"],
        "secondary_angles": ["torso_lean"],
        "rom_elbow": (80, 100),  # Bottom position
        "elbow_lockout": (160, 180),  # Top position
        "max_hip_drop": 0.06,  # Hips sagging
        "min_hip_drop": -0.10,  # Hips too high (pike)
        "min_elbow_flare": 40,  # Elbows shouldn't be fully tucked
        "partial_depth_threshold": 115,  # Not going low enough
    },
    "Lunge": {
        "primary_angles": ["left_knee", "right_knee"],
        "secondary_angles": ["left_hip", "right_hip"],
        "front_knee_rom": (80, 100),  # Optimal front knee angle
        "min_front_knee": 70,  # Don't over-bend
        "max_front_knee": 110,  # Don't under-bend
        "knee_over_toe_threshold": 0.18,  # Knee shouldn't pass toes
        "max_back_knee": 145,  # Back knee should approach floor
        "hip_tilt_threshold": 0.08,  # Torso should stay level
    },
    "Bench Press": {
        "primary_angles": ["left_elbow", "right_elbow"],
        "secondary_angles": ["torso_lean"],
        "rom_elbow": (75, 175),  # Full ROM for chest press
        "elbow_bottom": (75, 90),  # Bottom position
        "elbow_lockout": (160, 180),  # Top position
        "max_torso_lean": 15,  # Should remain on bench
        "elbow_flare_range": (45, 75),  # Optimal elbow angle to torso
        "asymmetry_threshold": 0.08,  # Bar should be level
    },
    "Tricep Curl": {
        "primary_angles": ["left_elbow", "right_elbow"],
        "secondary_angles": ["torso_lean"],
        "rom_elbow": (40, 170),  # Full ROM for tricep
        "elbow_fixed_threshold": 0.05,  # Elbows should stay fixed
        "max_torso_lean": 20,  # Upper body should stay stable
        "min_extension": 160,  # Should fully extend at top
    },
    "Tricep Extension": {
        "primary_angles": ["left_elbow", "right_elbow"],
        "secondary_angles": ["torso_lean"],
        "rom_elbow": (30, 160),  # Full ROM for extension
        "upper_arm_angle_range": (0, 30),  # Upper arm should be vertical
        "shoulder_stability_threshold": 0.06,  # Shoulders shouldn't elevate
        "min_lockout": 155,  # Should lock out at top
    },
    "Lateral Raise": {
        "primary_angles": ["left_shoulder", "right_shoulder"],
        "secondary_angles": ["left_elbow", "right_elbow"],
        "shoulder_angle_range": (0, 90),  # 0 = down, 90 = horizontal
        "optimal_top_angle": (75, 90),  # Optimal top position
        "elbow_angle_range": (150, 180),  # Elbows should stay nearly straight
        "max_shoulder_elevation": 0.08,  # Shoulders shouldn't shrug
        "torso_stability_threshold": 10,  # Torso should stay vertical
    },
    "Front Raise": {
        "primary_angles": ["left_shoulder", "right_shoulder"],
        "secondary_angles": ["left_elbow", "right_elbow"],
        "shoulder_angle_range": (0, 90),  # 0 = down, 90 = overhead
        "optimal_top_angle": (80, 90),  # Optimal top position
        "elbow_angle_range": (150, 180),  # Elbows should stay nearly straight
        "max_torso_sway": 0.06,  # Torso shouldn't sway
        "symmetry_threshold": 0.08,  # Arms should be even
    },
    "Pullup": {
        "primary_angles": ["left_elbow", "right_elbow"],
        "secondary_angles": ["torso_lean"],
        "rom_elbow": (40, 170),  # Full ROM for pullup
        "elbow_bottom": (40, 60),  # Chin at bar
        "elbow_lockout": (160, 180),  # Arms extended at bottom
        "max_body_swing": 0.10,  # Body shouldn't swing excessively
        "torso_stability_threshold": 15,  # Torso should stay relatively vertical
        "min_chin_clearance": 0.05,  # Chin should clear bar
    }
}

# ==================== EXERCISE CLASSIFICATION ====================

class ExerciseClassifier:
    """Classifies exercise type based on body pose using trained AI model."""
    
    def __init__(self):
        self.mp_pose = mp_pose  # Use global variable
        self.model = None
        self.label_classes = []
        
        # Temporal smoothing for exercise classification
        self.confidence_history = []
        self.max_history_length = 5
        self.min_confidence_frames = 3
        self.smoothing_threshold = 0.6
        self.current_exercise = ExerciseType.UNKNOWN
        self.current_confidence = 0.0
        
        try:
            import os
            import pickle
            import tensorflow as tf
            os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
            model_path = os.path.join(os.path.dirname(__file__), 'ai_training', 'exercise_classifier.h5')
            label_path = os.path.join(os.path.dirname(__file__), 'ai_training', 'label_classes.pkl')
            
            if os.path.exists(model_path) and os.path.exists(label_path):
                self.model = tf.keras.models.load_model(model_path)
                with open(label_path, 'rb') as f:
                    self.label_classes = pickle.load(f)
                print(f"Successfully loaded Custom AI Model with classes: {self.label_classes}")
            else:
                print("Custom AI Model not found. Falling back to rule-based classification.")
        except Exception as e:
            print(f"Could not load AI Model ({e}). Falling back to rule-based.")
    
    def classify(self, lm) -> ExerciseType:
        """Classify exercise based on body pose with temporal smoothing."""
        predicted_exercise = ExerciseType.UNKNOWN
        confidence = 0.0
        
        # Use AI Model if available
        if self.model is not None and len(self.label_classes) > 0:
            import numpy as np
            features = []
            for landmark in lm:
                features.extend([landmark.x, landmark.y, landmark.z, landmark.visibility])
            
            features = np.array(features).reshape(1, -1)
            predictions = self.model.predict(features, verbose=0)
            class_idx = np.argmax(predictions[0])
            confidence = predictions[0][class_idx]
            
            if confidence > 0.6:
                predicted_class = self.label_classes[class_idx].lower().replace('_', ' ').replace('-', ' ')
                # Map to enum
                for ex in ExerciseType:
                    if predicted_class in ex.value.lower() or ex.name.lower() in predicted_class:
                        predicted_exercise = ex
                        break
            else:
                # Low confidence, use rule-based fallback
                predicted_exercise = self._rule_based_classify(lm)
                confidence = 0.5  # Default confidence for rule-based
        else:
            # No model, use rule-based
            predicted_exercise = self._rule_based_classify(lm)
            confidence = 0.5
        
        # Temporal smoothing - update confidence history
        self.confidence_history.append((predicted_exercise, confidence))
        if len(self.confidence_history) > self.max_history_length:
            self.confidence_history.pop(0)
        
        # Smooth exercise selection
        if len(self.confidence_history) >= self.min_confidence_frames:
            # Count occurrences of each exercise in recent history
            exercise_counts = {}
            for ex, conf in self.confidence_history:
                exercise_counts[ex] = exercise_counts.get(ex, 0) + 1
            
            # Find most common exercise
            most_common = max(exercise_counts.items(), key=lambda x: x[1])
            
            # Only change if we have strong evidence
            if most_common[1] >= self.min_confidence_frames:
                self.current_exercise = most_common[0]
                self.current_confidence = most_common[1] / len(self.confidence_history)
        
        return self.current_exercise
    
    def get_confidence(self) -> float:
        """Get current exercise classification confidence."""
        return self.current_confidence
    
    def _rule_based_classify(self, lm) -> ExerciseType:
        
        # Get key points (Rule-based Fallback)
        l_sh = get_landmark_point(lm, self.mp_pose.PoseLandmark.LEFT_SHOULDER)
        r_sh = get_landmark_point(lm, self.mp_pose.PoseLandmark.RIGHT_SHOULDER)
        l_el = get_landmark_point(lm, self.mp_pose.PoseLandmark.LEFT_ELBOW)
        r_el = get_landmark_point(lm, self.mp_pose.PoseLandmark.RIGHT_ELBOW)
        l_wr = get_landmark_point(lm, self.mp_pose.PoseLandmark.LEFT_WRIST)
        r_wr = get_landmark_point(lm, self.mp_pose.PoseLandmark.RIGHT_WRIST)
        l_hp = get_landmark_point(lm, self.mp_pose.PoseLandmark.LEFT_HIP)
        r_hp = get_landmark_point(lm, self.mp_pose.PoseLandmark.RIGHT_HIP)
        l_kn = get_landmark_point(lm, self.mp_pose.PoseLandmark.LEFT_KNEE)
        r_kn = get_landmark_point(lm, self.mp_pose.PoseLandmark.RIGHT_KNEE)
        l_an = get_landmark_point(lm, self.mp_pose.PoseLandmark.LEFT_ANKLE)
        r_an = get_landmark_point(lm, self.mp_pose.PoseLandmark.RIGHT_ANKLE)
        
        # Calculate angles
        l_elbow = calculate_angle(l_sh, l_el, l_wr)
        r_elbow = calculate_angle(r_sh, r_el, r_wr)
        l_knee = calculate_angle(l_hp, l_kn, l_an)
        r_knee = calculate_angle(r_hp, r_kn, r_an)
        
        mid_sh = calculate_midpoint(l_sh, r_sh)
        mid_hp = calculate_midpoint(l_hp, r_hp)
        torso_lean = calculate_vertical_angle(mid_sh, mid_hp)
        
        # Push-up detection: hands near ground, body horizontal
        l_wr_y = l_wr[1]
        r_wr_y = r_wr[1]
        l_sh_y = l_sh[1]
        r_sh_y = r_sh[1]
        
        # If wrists are at similar height to shoulders (within range) and body is horizontal
        if abs(l_wr_y - l_sh_y) < 0.15 and abs(r_wr_y - r_sh_y) < 0.15:
            if torso_lean > 60:  # Body nearly horizontal
                return ExerciseType.PUSHUP
        
        # Shoulder press: wrists above shoulders
        wrists_above_shoulders = (l_wr[1] < l_sh[1] - 0.05) or (r_wr[1] < r_sh[1] - 0.05)
        if wrists_above_shoulders and min(l_elbow, r_elbow) > 90:
            return ExerciseType.SHOULDER_PRESS
        
        # Bicep curl: elbow flexed, wrists near shoulders but not overhead
        elbow_flexed = (l_elbow < 100) or (r_elbow < 100)
        wrists_not_overhead = (l_wr[1] > l_sh[1] - 0.02) and (r_wr[1] > r_sh[1] - 0.02)
        if elbow_flexed and wrists_not_overhead:
            return ExerciseType.BICEP_CURL
        
        # Lunge: one knee significantly bent, other straight
        knee_diff = abs(l_knee - r_knee)
        if knee_diff > 40 and min(l_knee, r_knee) < 100:
            return ExerciseType.LUNGE
        
        # Deadlift vs Squat
        knees_straightish = (l_knee > 140) and (r_knee > 140)
        
        if knees_straightish and torso_lean > 30:
            return ExerciseType.DEADLIFT
        
        # Default to squat if knees are bent
        if min(l_knee, r_knee) < 140:
            return ExerciseType.SQUAT
        
        return ExerciseType.UNKNOWN

# ==================== FORM VALIDATOR ====================

class FormValidator:
    """Validates exercise form and provides feedback."""
    
    def __init__(self):
        self.mp_pose = mp_pose  # Use global variable
        self.last_rep_state = None
        self.rep_count = 0
        self.correct_reps = 0
        self.wrong_reps = 0
        self.rep_in_progress = False
    
    def reset_counters(self):
        self.rep_count = 0
        self.correct_reps = 0
        self.wrong_reps = 0
        self.rep_in_progress = False
        self.last_rep_state = None
    
    def validate(self, exercise: ExerciseType, lm) -> Tuple[PostureStatus, str, List[str], Dict[str, float]]:
        """
        Validate exercise form.
        Returns: (status, issue_message, feedback_list, angles_dict)
        """
        # Get key points
        l_sh = get_landmark_point(lm, self.mp_pose.PoseLandmark.LEFT_SHOULDER)
        r_sh = get_landmark_point(lm, self.mp_pose.PoseLandmark.RIGHT_SHOULDER)
        l_el = get_landmark_point(lm, self.mp_pose.PoseLandmark.LEFT_ELBOW)
        r_el = get_landmark_point(lm, self.mp_pose.PoseLandmark.RIGHT_ELBOW)
        l_wr = get_landmark_point(lm, self.mp_pose.PoseLandmark.LEFT_WRIST)
        r_wr = get_landmark_point(lm, self.mp_pose.PoseLandmark.RIGHT_WRIST)
        l_hp = get_landmark_point(lm, self.mp_pose.PoseLandmark.LEFT_HIP)
        r_hp = get_landmark_point(lm, self.mp_pose.PoseLandmark.RIGHT_HIP)
        l_kn = get_landmark_point(lm, self.mp_pose.PoseLandmark.LEFT_KNEE)
        r_kn = get_landmark_point(lm, self.mp_pose.PoseLandmark.RIGHT_KNEE)
        l_an = get_landmark_point(lm, self.mp_pose.PoseLandmark.LEFT_ANKLE)
        r_an = get_landmark_point(lm, self.mp_pose.PoseLandmark.RIGHT_ANKLE)
        
        # Calculate angles
        l_knee_angle = calculate_angle(l_hp, l_kn, l_an)
        r_knee_angle = calculate_angle(r_hp, r_kn, r_an)
        l_hip_angle = calculate_angle(l_sh, l_hp, l_kn)
        r_hip_angle = calculate_angle(r_sh, r_hp, r_kn)
        l_elbow_angle = calculate_angle(l_sh, l_el, l_wr)
        r_elbow_angle = calculate_angle(r_sh, r_el, r_wr)
        
        mid_sh = calculate_midpoint(l_sh, r_sh)
        mid_hp = calculate_midpoint(l_hp, r_hp)
        torso_lean = calculate_vertical_angle(mid_sh, mid_hp)

        # Also calculate hip angles (paper: uses shoulder-hip-knee angle)
        l_hip_angle = calculate_angle(l_sh, l_hp, l_kn)
        r_hip_angle = calculate_angle(r_sh, r_hp, r_kn)

        angles = {
            "left_knee":  l_knee_angle,
            "right_knee": r_knee_angle,
            "left_hip":   l_hip_angle,
            "right_hip":  r_hip_angle,
            "left_elbow": l_elbow_angle,
            "right_elbow":r_elbow_angle,
            "torso_lean": torso_lean
        }

        status  = PostureStatus.CORRECT
        issues  = []
        feedback= []

        if exercise == ExerciseType.SQUAT:
            status, issues, feedback = self._validate_squat(
                l_knee_angle, r_knee_angle, l_hip_angle, r_hip_angle,
                torso_lean, l_hp, r_hp, l_kn, r_kn
            )
        elif exercise == ExerciseType.DEADLIFT:
            status, issues, feedback = self._validate_deadlift(
                l_knee_angle, r_knee_angle, l_hip_angle, r_hip_angle, torso_lean
            )
        elif exercise == ExerciseType.BICEP_CURL:
            status, issues, feedback = self._validate_bicep_curl(
                l_elbow_angle, r_elbow_angle, l_el, r_el, l_sh, r_sh, l_wr, r_wr
            )
        elif exercise == ExerciseType.SHOULDER_PRESS:
            status, issues, feedback = self._validate_shoulder_press(
                l_elbow_angle, r_elbow_angle, l_wr, r_wr, l_sh, r_sh, torso_lean
            )
        elif exercise == ExerciseType.PUSHUP:
            status, issues, feedback = self._validate_pushup(
                l_elbow_angle, r_elbow_angle, torso_lean, l_sh, r_sh, l_hp, r_hp
            )
        elif exercise == ExerciseType.LUNGE:
            status, issues, feedback = self._validate_lunge(
                l_knee_angle, r_knee_angle, l_hip_angle, r_hip_angle,
                l_hp, r_hp, l_kn, r_kn
            )
        elif exercise == ExerciseType.BENCH_PRESS:
            status, issues, feedback = self._validate_bench_press(
                l_elbow_angle, r_elbow_angle, l_el, r_el, l_sh, r_sh, l_wr, r_wr, torso_lean
            )
        elif exercise == ExerciseType.TRICEP_CURL:
            status, issues, feedback = self._validate_tricep_curl(
                l_elbow_angle, r_elbow_angle, l_el, r_el, l_sh, r_sh, l_wr, r_wr, torso_lean
            )
        elif exercise == ExerciseType.TRICEP_EXTENSION:
            status, issues, feedback = self._validate_tricep_extension(
                l_elbow_angle, r_elbow_angle, l_el, r_el, l_sh, r_sh, l_wr, r_wr, torso_lean
            )
        elif exercise == ExerciseType.LATERAL_RAISE:
            status, issues, feedback = self._validate_lateral_raise(
                l_sh, r_sh, l_el, r_el, l_wr, r_wr, l_hp, r_hp, torso_lean
            )
        elif exercise == ExerciseType.FRONT_RAISE:
            status, issues, feedback = self._validate_front_raise(
                l_sh, r_sh, l_el, r_el, l_wr, r_wr, l_hp, r_hp, torso_lean
            )
        elif exercise == ExerciseType.PULLUP:
            status, issues, feedback = self._validate_pullup(
                l_elbow_angle, r_elbow_angle, l_sh, r_sh, l_hp, r_hp, torso_lean
            )

        issue_msg = "; ".join(issues) if issues else "Good form!"
        return status, issue_msg, feedback, angles

    # ─────────────────────────────────────────────────────────────────
    #  PAPER-ALIGNED VALIDATORS
    #  Methodology: Joint angle θ = arccos(AB·BC / |AB||BC|)
    #  Thresholds sourced from biomechanics literature & IJRASET paper
    # ─────────────────────────────────────────────────────────────────

    def _validate_squat(self, l_knee, r_knee, l_hip, r_hip,
                        torso_lean, l_hp, r_hp, l_kn, r_kn):
        """
        SQUAT — paper approach:
        Key angles: knee (hip-knee-ankle), hip (shoulder-hip-knee), torso lean
        Correct form: knee 70°–110°, hip 80°–110°, torso lean < 45°
        Knee valgus: knee_width ≥ 0.75 × hip_width
        """
        issues, feedback = [], []
        status = PostureStatus.CORRECT
        min_knee = min(l_knee, r_knee)
        avg_hip  = (l_hip + r_hip) / 2

        # Phase check — standby
        if min_knee > 165:
            return status, ["Standby — lower into squat position"], []

        # ── Knee depth (primary metric per paper) ──────────────────
        # Optimal: 70°–110° at the bottom of the squat
        if min_knee > 115:
            issues.append("Squat too shallow — depth insufficient")
            feedback.append("Lower hips until thighs are parallel to the floor (aim 90°)")
        elif min_knee < 55:
            issues.append("Squat too deep — butt wink risk")
            feedback.append("Rise slightly; going below 55° strains the lumbar spine")
            status = PostureStatus.WRONG

        # ── Hip angle (paper: should be 80°–120° during descent) ───
        if avg_hip < 70:
            issues.append("Hips flexing too far forward")
            feedback.append("Keep chest tall; imagine sitting back onto a chair")
            status = PostureStatus.WRONG

        # ── Torso lean (paper: ≤ 45° from vertical) ────────────────
        if torso_lean > 45:
            issues.append("Excessive forward lean — spine at risk")
            feedback.append("Chest up, brace your core, look straight ahead")
            status = PostureStatus.WRONG

        # ── Knee valgus (paper: knee_width ≥ 75% of hip_width) ─────
        hip_w  = abs(l_hp[0] - r_hp[0])
        knee_w = abs(l_kn[0] - r_kn[0])
        if hip_w > 0 and knee_w < hip_w * 0.72:
            issues.append("Knee valgus — knees caving inward")
            feedback.append("Drive knees out over the little toe; strengthen glutes")
            status = PostureStatus.WRONG

        return status, issues, feedback

    def _validate_deadlift(self, l_knee, r_knee, l_hip, r_hip, torso_lean):
        """
        DEADLIFT — paper approach:
        Key angles: hip hinge (torso lean 30°–70°), knee 150°–170°
        Back neutral: torso_lean < 70°
        """
        issues, feedback = [], []
        status = PostureStatus.CORRECT
        min_knee = min(l_knee, r_knee)
        avg_hip  = (l_hip + r_hip) / 2

        # Standby
        if min_knee > 168 and torso_lean < 12:
            return status, ["Standby — initiate hip hinge to begin"], []

        # ── Knee angle (paper: 150°–170° = Romanian DL hinge) ──────
        if min_knee < 120:
            issues.append("Knees bending too much — becoming a squat")
            feedback.append("Keep legs near-straight; push hips back, not down")
            status = PostureStatus.WRONG

        # ── Hip hinge depth (paper: 30°–70° torso lean is correct) ─
        if torso_lean < 22 and min_knee > 145:
            issues.append("Not hinging enough at the hips")
            feedback.append("Push hips back until you feel the hamstring stretch")
            status = PostureStatus.WRONG

        # ── Spine neutral — INJURY critical (paper: < 70°) ─────────
        if torso_lean > 68:
            issues.append("Back rounding — INJURY RISK!")
            feedback.append("STOP! Brace core, maintain neutral spine, reset the lift")
            status = PostureStatus.WRONG

        # ── Hip symmetry (bilateral balance) ───────────────────────
        if abs(l_hip - r_hip) > 18:
            issues.append("Uneven hip loading — asymmetric hinge")
            feedback.append("Distribute weight evenly on both feet")
            status = PostureStatus.WRONG

        return status, issues, feedback

    def _validate_bicep_curl(self, l_elbow, r_elbow,
                              l_el, r_el, l_sh, r_sh, l_wr, r_wr):
        """
        BICEP CURL — paper approach:
        Key angle: elbow flexion/extension 30°–160° ROM
        Elbow must stay fixed at torso; no swinging
        """
        issues, feedback = [], []
        status = PostureStatus.CORRECT
        min_elbow = min(l_elbow, r_elbow)
        max_elbow = max(l_elbow, r_elbow)

        # ── Starting/ending position check ─────────────────────────
        if max_elbow > 168:
            # Arms fully extended — beginning or end of rep; not an error
            pass

        # ── Elbow fixed — must not rise above shoulder ──────────────
        # (paper: elbow should remain pinned at sides during curl)
        l_elbow_drift = l_sh[1] - l_el[1]   # +ve = elbow above shoulder
        r_elbow_drift = r_sh[1] - r_el[1]
        if l_elbow_drift > 0.04 or r_elbow_drift > 0.04:
            issues.append("Elbow rising — using momentum (cheating)")
            feedback.append("Pin elbows at your sides; isolate the bicep only")
            status = PostureStatus.WRONG

        # ── Wrist not above shoulder (over-curl) ───────────────────
        if l_wr[1] < l_sh[1] - 0.06 or r_wr[1] < r_sh[1] - 0.06:
            issues.append("Over-curling — wrist above shoulder")
            feedback.append("Stop the curl at shoulder level, squeeze the bicep")
            status = PostureStatus.WRONG

        # ── Elbow swinging laterally (paper: lateral drift check) ──
        if abs(l_el[0] - l_sh[0]) > 0.14 or abs(r_el[0] - r_sh[0]) > 0.14:
            issues.append("Elbow swinging outward — lose the momentum")
            feedback.append("Tuck elbows in; curl straight up and down")
            status = PostureStatus.WRONG

        # ── Full ROM check (paper: 30°–160° for full activation) ───
        if min_elbow > 145 and max_elbow > 145:
            issues.append("Not completing the curl — partial ROM")
            feedback.append("Curl weight all the way up for full bicep contraction")

        return status, issues, feedback

    def _validate_shoulder_press(self, l_elbow, r_elbow,
                                  l_wr, r_wr, l_sh, r_sh, torso_lean):
        """
        OVERHEAD PRESS — paper approach:
        Key angles: elbow extension at top (150°–180°), elbow at start (80°–100°)
        Torso: must remain vertical (< 15° lean)
        """
        issues, feedback = [], []
        status = PostureStatus.CORRECT
        avg_elbow = (l_elbow + r_elbow) / 2

        # ── Pressing phase — wrists must be overhead ────────────────
        wrists_above = (l_wr[1] < l_sh[1] - 0.04) or (r_wr[1] < r_sh[1] - 0.04)
        if not wrists_above:
            issues.append("Not pressing to full overhead position")
            feedback.append("Press arms fully overhead; lock out at the top")

        # ── Full lockout check (paper: elbow 150°–180° at top) ─────
        if wrists_above and avg_elbow < 148:
            issues.append("Elbows not locking out at the top")
            feedback.append("Fully extend arms overhead; don't stop halfway")

        # ── Torso lean — INJURY RISK (paper: < 15° lean) ───────────
        if torso_lean > 18:
            issues.append("Excessive back arch — lumbar INJURY RISK!")
            feedback.append("Brace core, squeeze glutes, keep torso vertical")
            status = PostureStatus.WRONG

        # ── Asymmetric press (paper: bilateral symmetry check) ──────
        l_h = l_sh[1] - l_wr[1]
        r_h = r_sh[1] - r_wr[1]
        if abs(l_h - r_h) > 0.10:
            issues.append("Uneven press — one arm higher than the other")
            feedback.append("Press both arms to the same height simultaneously")
            status = PostureStatus.WRONG

        return status, issues, feedback

    def _validate_pushup(self, l_elbow, r_elbow, torso_lean,
                          l_sh, r_sh, l_hp, r_hp):
        """
        PUSH-UP — paper approach:
        Key angles: elbow 80°–100° at bottom, 160°–180° at top
        Body alignment: hip-shoulder line must be straight (torso_lean < 20°)
        """
        issues, feedback = [], []
        status = PostureStatus.CORRECT
        min_elbow = min(l_elbow, r_elbow)
        avg_sh_y  = (l_sh[1] + r_sh[1]) / 2
        avg_hp_y  = (l_hp[1] + r_hp[1]) / 2
        hip_drop  = avg_hp_y - avg_sh_y   # +ve = hips below shoulders

        # ── Sagging hips (paper: hip-shoulder Y delta > 0.06) ──────
        if hip_drop > 0.06:
            issues.append("Sagging hips — core is not engaged")
            feedback.append("Squeeze core and glutes to keep body in a straight plank")
            status = PostureStatus.WRONG

        # ── Pike hips (hips too high) ───────────────────────────────
        if hip_drop < -0.10:
            issues.append("Hips too high — body is piked")
            feedback.append("Lower hips to align with shoulders and ankles")
            status = PostureStatus.WRONG

        # ── Elbow flare (paper: elbow 45° is optimal — not fully tucked/flared) ─
        if min_elbow < 40:
            issues.append("Elbows fully tucked — risk to shoulder joint")
            feedback.append("Flare elbows ~45° from your body for safer mechanics")

        # ── Depth check (paper: elbow ≤ 100° at bottom = full depth) ─
        if min_elbow > 115 and avg_hp_y > avg_sh_y - 0.02:
            issues.append("Not going low enough — partial push-up")
            feedback.append("Lower chest until elbows reach 90° for full range")

        return status, issues, feedback

    def _validate_lunge(self, l_knee, r_knee, l_hip, r_hip,
                        l_hp, r_hp, l_kn, r_kn):
        """
        LUNGE — paper approach:
        Front knee: 80°–100° (optimal loading)
        Back knee: ~90° (or lower)
        Torso upright: use hip asymmetry check
        Front knee must not pass toes (knee_x ≈ ankle_x)
        """
        issues, feedback = [], []
        status = PostureStatus.CORRECT

        # Identify front vs back leg by lower knee angle
        if l_knee <= r_knee:
            front_knee, back_knee = l_knee, r_knee
            fhp, bhp = l_hp, r_hp
            fkn, bkn = l_kn, r_kn
            f_hip, b_hip = l_hip, r_hip
        else:
            front_knee, back_knee = r_knee, l_knee
            fhp, bhp = r_hp, l_hp
            fkn, bkn = r_kn, l_kn
            f_hip, b_hip = r_hip, l_hip

        # Standby — not yet in lunge
        if front_knee > 165:
            return status, ["Standby — step forward into lunge position"], []

        # ── Front knee angle (paper: 80°–100° for optimal force distribution) ─
        if front_knee > 110:
            issues.append("Front knee too straight — lunge is too shallow")
            feedback.append("Step further forward; bend front knee to ~90°")
        elif front_knee < 70:
            issues.append("Front knee over-bent — joint stress risk")
            feedback.append("Rise slightly — keep front knee above the ankle")
            status = PostureStatus.WRONG

        # ── Knee-over-toe check (paper: knee_x should not exceed foot_x) ──
        if fkn[0] > fhp[0] + 0.18:
            issues.append("Front knee past toes — INJURY RISK!")
            feedback.append("Step wider; keep front shin vertical over the ankle")
            status = PostureStatus.WRONG

        # ── Back knee depth (paper: back knee should approach the floor) ───
        if back_knee > 145:
            issues.append("Back knee too high — not completing the lunge")
            feedback.append("Sink the back knee closer to the floor")

        # ── Torso upright (hip symmetry check) ─────────────────────
        hip_tilt = abs(fhp[1] - bhp[1])
        if hip_tilt > 0.08:
            issues.append("Torso tilting — keep hips level")
            feedback.append("Engage core; keep hips squared and level")
            status = PostureStatus.WRONG

        return status, issues, feedback

    def _validate_bench_press(self, l_elbow, r_elbow,
                             l_el, r_el, l_sh, r_sh, l_wr, r_wr, torso_lean):
        """
        BENCH PRESS — biomechanics approach:
        Key angles: elbow 75°–175° ROM, 75°–90° at bottom, 160°–180° at top
        Torso: must remain on bench (< 15° lean)
        Elbow flare: 45°–75° from torso
        """
        issues, feedback = [], []
        status = PostureStatus.CORRECT
        min_elbow = min(l_elbow, r_elbow)
        max_elbow = max(l_elbow, r_elbow)
        avg_elbow = (l_elbow + r_elbow) / 2

        # Standby - arms extended
        if max_elbow > 170:
            return status, ["Standby — lower bar to chest"], []

        # ── Elbow flare (shouldn't be too wide or too narrow) ───────
        # Calculate elbow angle relative to horizontal plane
        l_elbow_flare = calculate_vertical_angle(l_sh, l_el)
        r_elbow_flare = calculate_vertical_angle(r_sh, r_el)
        avg_flare = (l_elbow_flare + r_elbow_flare) / 2
        
        if avg_flare < 45:
            issues.append("Elbows too tucked — limits chest activation")
            feedback.append("Flare elbows ~45° from torso for optimal chest activation")
        elif avg_flare > 75:
            issues.append("Elbows too wide — shoulder stress risk")
            feedback.append("Bring elbows in to ~60° angle")

        # ── Bottom position check (75°–90° for full ROM) ─────────
        if min_elbow > 90 and max_elbow > 90:
            issues.append("Not lowering bar enough — partial ROM")
            feedback.append("Lower bar until elbows reach 75°–90° for full chest activation")

        # ── Lockout check (160°–180° at top) ───────────────────────
        if min_elbow < 160 and max_elbow < 160:
            issues.append("Not locking out at top")
            feedback.append("Fully extend arms at the top")

        # ── Torso stability (should stay on bench) ───────────────────
        if torso_lean > 15:
            issues.append("Back arching off bench — lumbar stress")
            feedback.append("Keep back flat against bench, engage core")
            status = PostureStatus.WRONG

        # ── Bar symmetry (should stay level) ───────────────────────
        l_height = l_sh[1] - l_wr[1]
        r_height = r_sh[1] - r_wr[1]
        if abs(l_height - r_height) > 0.08:
            issues.append("Bar tilting — uneven press")
            feedback.append("Press evenly with both arms to keep bar level")
            status = PostureStatus.WRONG

        return status, issues, feedback

    def _validate_tricep_curl(self, l_elbow, r_elbow,
                               l_el, r_el, l_sh, r_sh, l_wr, r_wr, torso_lean):
        """
        TRICEP CURL — biomechanics approach:
        Key angles: elbow 40°–170° ROM
        Elbows must stay fixed at sides during movement
        Upper body should remain stable
        """
        issues, feedback = [], []
        status = PostureStatus.CORRECT
        min_elbow = min(l_elbow, r_elbow)
        max_elbow = max(l_elbow, r_elbow)

        # Standby - arms extended
        if max_elbow > 165:
            return status, ["Standby — begin curl movement"], []

        # ── Elbow fixed at sides (shouldn't drift upward) ───────────
        l_elbow_drift = l_sh[1] - l_el[1]
        r_elbow_drift = r_sh[1] - r_el[1]
        if l_elbow_drift > 0.05 or r_elbow_drift > 0.05:
            issues.append("Elbows rising — using momentum")
            feedback.append("Pin elbows at your sides, keep them fixed")
            status = PostureStatus.WRONG

        # ── Upper body stability ───────────────────────────────────
        if torso_lean > 20:
            issues.append("Upper body swaying — reduces tricep isolation")
            feedback.append("Keep torso stable, don't rock body")
            status = PostureStatus.WRONG

        # ── Full extension at top (160°+) ───────────────────────────
        if min_elbow < 160 and max_elbow < 160:
            issues.append("Not fully extending at top")
            feedback.append("Fully extend arms to work full tricep ROM")

        # ── Full flexion at bottom (40°–60°) ───────────────────────
        if min_elbow > 60 and max_elbow > 60:
            issues.append("Not curling deep enough")
            feedback.append("Lower weight until elbows reach 40°–60°")

        return status, issues, feedback

    def _validate_tricep_extension(self, l_elbow, r_elbow,
                                   l_el, r_el, l_sh, r_sh, l_wr, r_wr, torso_lean):
        """
        TRICEP EXTENSION (Overhead) — biomechanics approach:
        Key angles: elbow 30°–160° ROM
        Upper arms should be vertical (0°–30° from vertical)
        Shoulders shouldn't elevate during movement
        """
        issues, feedback = [], []
        status = PostureStatus.CORRECT
        min_elbow = min(l_elbow, r_elbow)
        max_elbow = max(l_elbow, r_elbow)

        # Calculate upper arm angle from vertical
        l_upper_arm_angle = calculate_vertical_angle(l_sh, l_el)
        r_upper_arm_angle = calculate_vertical_angle(r_sh, r_el)
        avg_upper_arm = (l_upper_arm_angle + r_upper_arm_angle) / 2

        # Standby - arms extended overhead
        if min_elbow > 155:
            return status, ["Standby — begin extension"], []

        # ── Upper arm position (should be vertical) ─────────────────
        if avg_upper_arm > 30:
            issues.append("Upper arms not vertical — reduces tricep isolation")
            feedback.append("Keep upper arms vertical, pointing to ceiling")
            status = PostureStatus.WRONG

        # ── Shoulder elevation (shouldn't shrug) ────────────────────
        # Check if shoulders are moving upward
        shoulder_y_avg = (l_sh[1] + r_sh[1]) / 2
        elbow_y_avg = (l_el[1] + r_el[1]) / 2
        if elbow_y_avg - shoulder_y_avg < 0.15:
            issues.append("Shoulders elevating — engages traps instead of triceps")
            feedback.append("Keep shoulders down, only move forearms")
            status = PostureStatus.WRONG

        # ── Full lockout at top (155°+) ────────────────────────────
        if min_elbow < 155 and max_elbow < 155:
            issues.append("Not fully extending at top")
            feedback.append("Fully extend arms to work triceps through full ROM")

        # ── Full flexion at bottom (30°–50°) ───────────────────────
        if min_elbow > 50 and max_elbow > 50:
            issues.append("Not lowering weight enough")
            feedback.append("Lower weight until elbows reach 30°–50°")

        return status, issues, feedback

    def _validate_lateral_raise(self, l_sh, r_sh, l_el, r_el, l_wr, r_wr, l_hp, r_hp, torso_lean):
        """
        LATERAL RAISE — biomechanics approach:
        Key angles: shoulder 0°–90° ROM, optimal top 75°–90°
        Elbows should stay nearly straight (150°–180°)
        Shoulders shouldn't shrug excessively
        Torso should remain stable
        """
        issues, feedback = [], []
        status = PostureStatus.CORRECT

        # Calculate shoulder angle (horizontal plane raise)
        # Use wrist position relative to shoulder to estimate raise angle
        l_shoulder_angle = calculate_vertical_angle(l_sh, l_wr)
        r_shoulder_angle = calculate_vertical_angle(r_sh, r_wr)
        avg_shoulder_angle = (l_shoulder_angle + r_shoulder_angle) / 2

        # Calculate elbow angles
        l_elbow_angle = calculate_angle(l_sh, l_el, l_wr)
        r_elbow_angle = calculate_angle(r_sh, r_el, r_wr)
        avg_elbow_angle = (l_elbow_angle + r_elbow_angle) / 2

        # Standby - arms at sides
        if avg_shoulder_angle < 10:
            return status, ["Standby — begin lateral raise"], []

        # ── Elbow position (should stay nearly straight) ────────────
        if avg_elbow_angle < 150:
            issues.append("Elbows bent — reduces lateral deltoid isolation")
            feedback.append("Keep elbows nearly straight, slight bend only")
            status = PostureStatus.WRONG

        # ── Shoulder shrug detection ────────────────────────────────
        # Check if shoulders are elevating during raise
        shoulder_hip_diff = abs((l_sh[1] + r_sh[1]) / 2 - (l_hp[1] + r_hp[1]) / 2)
        if shoulder_hip_diff > 0.08:
            issues.append("Shoulders shrugging — engages traps instead of delts")
            feedback.append("Keep shoulders down, raise only arms")
            status = PostureStatus.WRONG

        # ── Top position check (75°–90° optimal) ───────────────────
        if avg_shoulder_angle > 90:
            issues.append("Raising too high — impingement risk")
            feedback.append("Stop at 90° horizontal, don't go higher")
            status = PostureStatus.WRONG
        elif avg_shoulder_angle < 75 and avg_shoulder_angle > 30:
            issues.append("Not raising high enough")
            feedback.append("Raise arms to 75°–90° for optimal deltoid activation")

        # ── Torso stability ───────────────────────────────────────
        if torso_lean > 10:
            issues.append("Torso leaning — reduces exercise effectiveness")
            feedback.append("Keep torso vertical, don't lean side-to-side")

        return status, issues, feedback

    def _validate_front_raise(self, l_sh, r_sh, l_el, r_el, l_wr, r_wr, l_hp, r_hp, torso_lean):
        """
        FRONT RAISE — biomechanics approach:
        Key angles: shoulder 0°–90° ROM, optimal top 80°–90°
        Elbows should stay nearly straight (150°–180°)
        Torso shouldn't sway excessively
        Arms should be symmetrical
        """
        issues, feedback = [], []
        status = PostureStatus.CORRECT

        # Calculate shoulder angle (frontal plane raise)
        l_shoulder_angle = calculate_vertical_angle(l_sh, l_wr)
        r_shoulder_angle = calculate_vertical_angle(r_sh, r_wr)
        avg_shoulder_angle = (l_shoulder_angle + r_shoulder_angle) / 2

        # Calculate elbow angles
        l_elbow_angle = calculate_angle(l_sh, l_el, l_wr)
        r_elbow_angle = calculate_angle(r_sh, r_el, r_wr)
        avg_elbow_angle = (l_elbow_angle + r_elbow_angle) / 2

        # Standby - arms at sides
        if avg_shoulder_angle < 10:
            return status, ["Standby — begin front raise"], []

        # ── Elbow position (should stay nearly straight) ────────────
        if avg_elbow_angle < 150:
            issues.append("Elbows bent — reduces anterior deltoid isolation")
            feedback.append("Keep elbows nearly straight throughout movement")
            status = PostureStatus.WRONG

        # ── Torso sway detection ────────────────────────────────────
        # Check if torso is swaying forward/backward
        if torso_lean > 10:
            issues.append("Torso swaying — reduces exercise effectiveness")
            feedback.append("Keep torso stable, don't rock body")
            status = PostureStatus.WRONG

        # ── Symmetry check (arms should be even) ──────────────────
        if abs(l_shoulder_angle - r_shoulder_angle) > 0.08:
            issues.append("Arms uneven — asymmetric raise")
            feedback.append("Raise both arms to the same height")
            status = PostureStatus.WRONG

        # ── Top position check (80°–90° optimal) ───────────────────
        if avg_shoulder_angle > 90:
            issues.append("Raising too high — potential shoulder impingement")
            feedback.append("Stop at 90° horizontal, don't go higher")
            status = PostureStatus.WRONG
        elif avg_shoulder_angle < 80 and avg_shoulder_angle > 30:
            issues.append("Not raising high enough")
            feedback.append("Raise arms to 80°–90° for optimal front deltoid activation")

        return status, issues, feedback

    def _validate_pullup(self, l_elbow, r_elbow, l_sh, r_sh, l_hp, r_hp, torso_lean):
        """
        PULLUP — biomechanics approach with conservative detection:
        Key angles: elbow 40°–170° ROM
        Chin should clear bar at top (40°–60° elbow)
        Arms should extend at bottom (160°–180°)
        Body shouldn't swing excessively
        Torso should stay relatively vertical
        
        LIMITATION: Camera angle and depth perception make precise bar detection difficult.
        This implementation is conservative and may have reduced accuracy.
        """
        issues, feedback = [], []
        status = PostureStatus.CORRECT
        min_elbow = min(l_elbow, r_elbow)
        max_elbow = max(l_elbow, r_elbow)

        # Standby - arms extended
        if max_elbow > 165:
            return status, ["Standby — begin pullup"], []

        # ── Body swing detection (common cheating mechanism) ─────────
        # Check if body is swinging by monitoring torso stability
        mid_sh = calculate_midpoint(l_sh, r_sh)
        mid_hp = calculate_midpoint(l_hp, r_hp)
        body_sway = abs(mid_sh[0] - mid_hp[0])
        
        if body_sway > 0.10:
            issues.append("Body swinging — using momentum instead of strength")
            feedback.append("Control the swing, keep body relatively still")
            status = PostureStatus.WRONG

        # ── Torso stability (should stay relatively vertical) ───────
        if torso_lean > 15:
            issues.append("Torso leaning excessively — reduces pullup effectiveness")
            feedback.append("Keep torso more vertical, engage core")

        # ── Chin clearance (estimated from elbow angle) ─────────────
        # In pullup, chin at bar ≈ 40°–60° elbow angle
        if min_elbow > 60 and max_elbow > 60:
            issues.append("Not pulling high enough")
            feedback.append("Pull until chin clears the bar (elbows ~50°)")

        # ── Full extension at bottom (160°–180°) ───────────────────
        if min_elbow < 160 and max_elbow < 160:
            issues.append("Not fully extending at bottom")
            feedback.append("Fully extend arms at bottom for full ROM")

        # ── Partial ROM warning ────────────────────────────────────
        if min_elbow > 90 and max_elbow > 90:
            issues.append("Partial ROM detected")
            feedback.append("Try to complete full range of motion for better results")

        return status, issues, feedback


# ==================== REP COUNTER ====================

class RepCounter:
    """Counts repetitions using state machine."""
    
    def __init__(self):
        self.state = "idle"  # idle, down, up
        self.count = 0
        self.correct_count = 0
        self.wrong_count = 0
        self.min_confidence_frames = 3
        self.frame_counts = {"down": 0, "up": 0}
    
    def reset(self):
        self.state = "idle"
        self.count = 0
        self.correct_count = 0
        self.wrong_count = 0
        self.frame_counts = {"down": 0, "up": 0}
    
    def update(self, exercise: ExerciseType, lm, status: PostureStatus, mp_pose) -> bool:
        """
        Update rep counter based on exercise movement.
        Returns True if a rep was completed.
        """
        if exercise == ExerciseType.UNKNOWN:
            return False
        
        # MediaPipe Pose landmark indices (33 landmarks total)
        # 0: nose, 11: left_shoulder, 12: right_shoulder, 13: left_elbow, 14: right_elbow
        # 15: left_wrist, 16: right_wrist, 23: left_hip, 24: right_hip
        # 25: left_knee, 26: right_knee, 27: left_ankle, 28: right_ankle
        
        # Get key angles for rep detection using landmark indices
        l_hp = get_landmark_point(lm, 23)  # LEFT_HIP
        r_hp = get_landmark_point(lm, 24)  # RIGHT_HIP
        l_kn = get_landmark_point(lm, 25)  # LEFT_KNEE
        r_kn = get_landmark_point(lm, 26)  # RIGHT_KNEE
        l_an = get_landmark_point(lm, 27)  # LEFT_ANKLE
        r_an = get_landmark_point(lm, 28)  # RIGHT_ANKLE
        l_sh = get_landmark_point(lm, 11)  # LEFT_SHOULDER
        r_sh = get_landmark_point(lm, 12)  # RIGHT_SHOULDER
        l_el = get_landmark_point(lm, 13)  # LEFT_ELBOW
        r_el = get_landmark_point(lm, 14)  # RIGHT_ELBOW
        l_wr = get_landmark_point(lm, 15)  # LEFT_WRIST
        r_wr = get_landmark_point(lm, 16)  # RIGHT_WRIST
        
        l_knee_angle = calculate_angle(l_hp, l_kn, l_an)
        r_knee_angle = calculate_angle(r_hp, r_kn, r_an)
        l_elbow_angle = calculate_angle(l_sh, l_el, l_wr)
        r_elbow_angle = calculate_angle(r_sh, r_el, r_wr)
        
        rep_completed = False
        
        if exercise in [ExerciseType.SQUAT, ExerciseType.LUNGE]:
            rep_completed = self._detect_squat_rep(min(l_knee_angle, r_knee_angle), status)
        elif exercise == ExerciseType.DEADLIFT:
            mid_hp = calculate_midpoint(l_hp, r_hp)
            mid_sh = calculate_midpoint(l_sh, r_sh)
            torso_lean = calculate_vertical_angle(mid_sh, mid_hp)
            rep_completed = self._detect_deadlift_rep(min(l_knee_angle, r_knee_angle), torso_lean, status)
        elif exercise == ExerciseType.BICEP_CURL:
            rep_completed = self._detect_curl_rep(min(l_elbow_angle, r_elbow_angle), status)
        elif exercise == ExerciseType.SHOULDER_PRESS:
            rep_completed = self._detect_press_rep(l_wr, r_wr, l_sh, r_sh, status)
        elif exercise == ExerciseType.PUSHUP:
            rep_completed = self._detect_pushup_rep(min(l_elbow_angle, r_elbow_angle), status)
        elif exercise == ExerciseType.BENCH_PRESS:
            rep_completed = self._detect_bench_press_rep(min(l_elbow_angle, r_elbow_angle), status)
        elif exercise == ExerciseType.TRICEP_CURL:
            rep_completed = self._detect_tricep_curl_rep(min(l_elbow_angle, r_elbow_angle), status)
        elif exercise == ExerciseType.TRICEP_EXTENSION:
            rep_completed = self._detect_tricep_extension_rep(min(l_elbow_angle, r_elbow_angle), status)
        elif exercise == ExerciseType.LATERAL_RAISE:
            rep_completed = self._detect_lateral_raise_rep(l_sh, r_sh, l_wr, r_wr, status)
        elif exercise == ExerciseType.FRONT_RAISE:
            rep_completed = self._detect_front_raise_rep(l_sh, r_sh, l_wr, r_wr, status)
        elif exercise == ExerciseType.PULLUP:
            rep_completed = self._detect_pullup_rep(min(l_elbow_angle, r_elbow_angle), status)
        
        return rep_completed
    
    def _detect_squat_rep(self, knee_angle, status):
        """Detect squat repetition: standing -> down -> standing."""
        # Down position (knee bent)
        if knee_angle < 100:
            self.frame_counts["down"] += 1
            if self.frame_counts["down"] >= self.min_confidence_frames:
                if self.state == "idle":
                    self.state = "down"
                self.frame_counts["down"] = 0
        
        # Up position (standing)
        elif knee_angle > 160:
            self.frame_counts["up"] += 1
            if self.frame_counts["up"] >= self.min_confidence_frames:
                if self.state == "down":
                    # Rep completed!
                    self.count += 1
                    if status == PostureStatus.CORRECT:
                        self.correct_count += 1
                    else:
                        self.wrong_count += 1
                    self.state = "up"
                    return True
                elif self.state == "up":
                    self.state = "idle"
                self.frame_counts["up"] = 0
        
        return False
    
    def _detect_deadlift_rep(self, knee_angle, torso_lean, status):
        """Detect deadlift repetition."""
        # Down position (hinged forward)
        if torso_lean > 40 and knee_angle > 130:
            self.frame_counts["down"] += 1
            if self.frame_counts["down"] >= self.min_confidence_frames:
                if self.state == "idle":
                    self.state = "down"
                self.frame_counts["down"] = 0
        
        # Up position (standing straight)
        elif torso_lean < 20 and knee_angle > 160:
            self.frame_counts["up"] += 1
            if self.frame_counts["up"] >= self.min_confidence_frames:
                if self.state == "down":
                    self.count += 1
                    if status == PostureStatus.CORRECT:
                        self.correct_count += 1
                    else:
                        self.wrong_count += 1
                    self.state = "up"
                    return True
                elif self.state == "up":
                    self.state = "idle"
                self.frame_counts["up"] = 0
        
        return False
    
    def _detect_curl_rep(self, elbow_angle, status):
        """Detect bicep curl repetition."""
        # Curl up (elbow bent)
        if elbow_angle < 60:
            self.frame_counts["down"] += 1
            if self.frame_counts["down"] >= self.min_confidence_frames:
                if self.state == "idle":
                    self.state = "down"
                self.frame_counts["down"] = 0
        
        # Extend (elbow straight)
        elif elbow_angle > 140:
            self.frame_counts["up"] += 1
            if self.frame_counts["up"] >= self.min_confidence_frames:
                if self.state == "down":
                    self.count += 1
                    if status == PostureStatus.CORRECT:
                        self.correct_count += 1
                    else:
                        self.wrong_count += 1
                    self.state = "up"
                    return True
                elif self.state == "up":
                    self.state = "idle"
                self.frame_counts["up"] = 0
        
        return False
    
    def _detect_press_rep(self, l_wr, r_wr, l_sh, r_sh, status):
        """Detect shoulder press repetition."""
        l_height = l_sh[1] - l_wr[1]
        r_height = r_sh[1] - r_wr[1]
        avg_height = (l_height + r_height) / 2
        
        # Press up (wrists above shoulders)
        if avg_height > 0.1:
            self.frame_counts["down"] += 1
            if self.frame_counts["down"] >= self.min_confidence_frames:
                if self.state == "idle":
                    self.state = "down"
                self.frame_counts["down"] = 0
        
        # Lower down
        elif avg_height < 0.02:
            self.frame_counts["up"] += 1
            if self.frame_counts["up"] >= self.min_confidence_frames:
                if self.state == "down":
                    self.count += 1
                    if status == PostureStatus.CORRECT:
                        self.correct_count += 1
                    else:
                        self.wrong_count += 1
                    self.state = "up"
                    return True
                elif self.state == "up":
                    self.state = "idle"
                self.frame_counts["up"] = 0
        
        return False
    
    def _detect_pushup_rep(self, elbow_angle, status):
        """Detect push-up repetition."""
        # Down position (elbows bent)
        if elbow_angle < 90:
            self.frame_counts["down"] += 1
            if self.frame_counts["down"] >= self.min_confidence_frames:
                if self.state == "idle":
                    self.state = "down"
                self.frame_counts["down"] = 0
        
        # Up position (arms extended)
        elif elbow_angle > 160:
            self.frame_counts["up"] += 1
            if self.frame_counts["up"] >= self.min_confidence_frames:
                if self.state == "down":
                    self.count += 1
                    if status == PostureStatus.CORRECT:
                        self.correct_count += 1
                    else:
                        self.wrong_count += 1
                    self.state = "up"
                    return True
                elif self.state == "up":
                    self.state = "idle"
                self.frame_counts["up"] = 0
        
        return False
    
    def _detect_bench_press_rep(self, elbow_angle, status):
        """Detect bench press repetition: extended -> lowered -> extended."""
        # Down position (bar at chest)
        if elbow_angle < 90:
            self.frame_counts["down"] += 1
            if self.frame_counts["down"] >= self.min_confidence_frames:
                if self.state == "idle":
                    self.state = "down"
                self.frame_counts["down"] = 0
        
        # Up position (arms extended)
        elif elbow_angle > 160:
            self.frame_counts["up"] += 1
            if self.frame_counts["up"] >= self.min_confidence_frames:
                if self.state == "down":
                    self.count += 1
                    if status == PostureStatus.CORRECT:
                        self.correct_count += 1
                    else:
                        self.wrong_count += 1
                    self.state = "up"
                    return True
                elif self.state == "up":
                    self.state = "idle"
                self.frame_counts["up"] = 0
        
        return False
    
    def _detect_tricep_curl_rep(self, elbow_angle, status):
        """Detect tricep curl repetition: extended -> curled -> extended."""
        # Curl position (elbow bent)
        if elbow_angle < 60:
            self.frame_counts["down"] += 1
            if self.frame_counts["down"] >= self.min_confidence_frames:
                if self.state == "idle":
                    self.state = "down"
                self.frame_counts["down"] = 0
        
        # Extend (elbow straight)
        elif elbow_angle > 160:
            self.frame_counts["up"] += 1
            if self.frame_counts["up"] >= self.min_confidence_frames:
                if self.state == "down":
                    self.count += 1
                    if status == PostureStatus.CORRECT:
                        self.correct_count += 1
                    else:
                        self.wrong_count += 1
                    self.state = "up"
                    return True
                elif self.state == "up":
                    self.state = "idle"
                self.frame_counts["up"] = 0
        
        return False
    
    def _detect_tricep_extension_rep(self, elbow_angle, status):
        """Detect tricep extension repetition: extended -> lowered -> extended."""
        # Lowered position (elbow bent)
        if elbow_angle < 50:
            self.frame_counts["down"] += 1
            if self.frame_counts["down"] >= self.min_confidence_frames:
                if self.state == "idle":
                    self.state = "down"
                self.frame_counts["down"] = 0
        
        # Extended (elbow straight overhead)
        elif elbow_angle > 155:
            self.frame_counts["up"] += 1
            if self.frame_counts["up"] >= self.min_confidence_frames:
                if self.state == "down":
                    self.count += 1
                    if status == PostureStatus.CORRECT:
                        self.correct_count += 1
                    else:
                        self.wrong_count += 1
                    self.state = "up"
                    return True
                elif self.state == "up":
                    self.state = "idle"
                self.frame_counts["up"] = 0
        
        return False
    
    def _detect_lateral_raise_rep(self, l_sh, r_sh, l_wr, r_wr, status):
        """Detect lateral raise repetition: arms down -> raised -> arms down."""
        # Calculate raise height (shoulder to wrist vertical distance)
        l_height = l_sh[1] - l_wr[1]
        r_height = r_sh[1] - r_wr[1]
        avg_height = (l_height + r_height) / 2
        
        # Raised position (arms at or above horizontal)
        if avg_height > 0.7:
            self.frame_counts["down"] += 1
            if self.frame_counts["down"] >= self.min_confidence_frames:
                if self.state == "idle":
                    self.state = "down"
                self.frame_counts["down"] = 0
        
        # Lowered position (arms at sides)
        elif avg_height < 0.1:
            self.frame_counts["up"] += 1
            if self.frame_counts["up"] >= self.min_confidence_frames:
                if self.state == "down":
                    self.count += 1
                    if status == PostureStatus.CORRECT:
                        self.correct_count += 1
                    else:
                        self.wrong_count += 1
                    self.state = "up"
                    return True
                elif self.state == "up":
                    self.state = "idle"
                self.frame_counts["up"] = 0
        
        return False
    
    def _detect_front_raise_rep(self, l_sh, r_sh, l_wr, r_wr, status):
        """Detect front raise repetition: arms down -> raised -> arms down."""
        # Calculate raise height (shoulder to wrist vertical distance)
        l_height = l_sh[1] - l_wr[1]
        r_height = r_sh[1] - r_wr[1]
        avg_height = (l_height + r_height) / 2
        
        # Raised position (arms overhead or at horizontal)
        if avg_height > 0.7:
            self.frame_counts["down"] += 1
            if self.frame_counts["down"] >= self.min_confidence_frames:
                if self.state == "idle":
                    self.state = "down"
                self.frame_counts["down"] = 0
        
        # Lowered position (arms at sides)
        elif avg_height < 0.1:
            self.frame_counts["up"] += 1
            if self.frame_counts["up"] >= self.min_confidence_frames:
                if self.state == "down":
                    self.count += 1
                    if status == PostureStatus.CORRECT:
                        self.correct_count += 1
                    else:
                        self.wrong_count += 1
                    self.state = "up"
                    return True
                elif self.state == "up":
                    self.state = "idle"
                self.frame_counts["up"] = 0
        
        return False
    
    def _detect_pullup_rep(self, elbow_angle, status):
        """Detect pullup repetition: extended -> pulled up -> extended."""
        # Up position (chin at bar, elbows bent)
        if elbow_angle < 60:
            self.frame_counts["down"] += 1
            if self.frame_counts["down"] >= self.min_confidence_frames:
                if self.state == "idle":
                    self.state = "down"
                self.frame_counts["down"] = 0
        
        # Down position (arms extended)
        elif elbow_angle > 160:
            self.frame_counts["up"] += 1
            if self.frame_counts["up"] >= self.min_confidence_frames:
                if self.state == "down":
                    self.count += 1
                    if status == PostureStatus.CORRECT:
                        self.correct_count += 1
                    else:
                        self.wrong_count += 1
                    self.state = "up"
                    return True
                elif self.state == "up":
                    self.state = "idle"
                self.frame_counts["up"] = 0
        
        return False

# ==================== FORM SCORE CALCULATOR ====================

class FormScoreCalculator:
    """Calculates form score (0-100) based on measurable signals."""
    
    def __init__(self):
        # Configurable weights for form scoring
        self.weights = {
            "angle_accuracy": 0.30,      # How close angles are to optimal
            "rom_completion": 0.25,      # Full range of motion
            "body_alignment": 0.20,      # Torso/hip alignment
            "stability": 0.15,            # Movement stability
            "consistency": 0.10,          # Consistency across reps
        }
    
    def calculate_form_score(self, exercise: ExerciseType, angles: Dict[str, float], 
                           issues: List[str], rom_data: Dict[str, float] = None) -> float:
        """
        Calculate form score (0-100) based on measurable signals.
        
        Args:
            exercise: Current exercise type
            angles: Dictionary of joint angles
            issues: List of detected form issues
            rom_data: Optional dict with actual vs target ROM
        
        Returns:
            Form score from 0-100
        """
        if not angles:
            return 0.0
        
        score = 100.0
        penalty = 0.0
        
        # Get exercise-specific thresholds from config
        config = EXERCISE_CONFIG.get(exercise.value, {})
        
        # 1. Angle Accuracy (how close to optimal ranges)
        angle_score = self._calculate_angle_accuracy(exercise, angles, config)
        penalty += (1.0 - angle_score) * self.weights["angle_accuracy"] * 100
        
        # 2. ROM Completion
        if rom_data:
            rom_score = self._calculate_rom_completion(exercise, rom_data, config)
            penalty += (1.0 - rom_score) * self.weights["rom_completion"] * 100
        
        # 3. Body Alignment (torso lean, hip symmetry)
        alignment_score = self._calculate_body_alignment(exercise, angles, config)
        penalty += (1.0 - alignment_score) * self.weights["body_alignment"] * 100
        
        # 4. Stability (based on error count)
        stability_score = self._calculate_stability(issues)
        penalty += (1.0 - stability_score) * self.weights["stability"] * 100
        
        # 5. Consistency (would need historical data, simplified for now)
        # Using current state as proxy
        consistency_score = 0.8 if len(issues) <= 2 else 0.5
        penalty += (1.0 - consistency_score) * self.weights["consistency"] * 100
        
        final_score = max(0.0, min(100.0, 100.0 - penalty))
        return round(final_score, 1)
    
    def _calculate_angle_accuracy(self, exercise: ExerciseType, angles: Dict[str, float], 
                                config: Dict) -> float:
        """Calculate how close angles are to optimal ranges."""
        score = 1.0
        
        # Get target ranges from config
        rom = config.get("rom_knee", None)
        if rom and "left_knee" in angles and "right_knee" in angles:
            avg_knee = (angles["left_knee"] + angles["right_knee"]) / 2
            target_center = (rom[0] + rom[1]) / 2
            target_range = rom[1] - rom[0]
            if target_range > 0:
                deviation = abs(avg_knee - target_center)
                # Normalize deviation (within ±50% of range is OK)
                if deviation < target_range * 0.5:
                    score = 1.0
                elif deviation < target_range:
                    score = 0.7
                else:
                    score = 0.4
        
        # Hip angle accuracy
        rom_hip = config.get("rom_hip", None)
        if rom_hip and "left_hip" in angles and "right_hip" in angles:
            avg_hip = (angles["left_hip"] + angles["right_hip"]) / 2
            target_center = (rom_hip[0] + rom_hip[1]) / 2
            target_range = rom_hip[1] - rom_hip[0]
            if target_range > 0:
                deviation = abs(avg_hip - target_center)
                if deviation < target_range * 0.5:
                    score = min(score, 1.0)
                elif deviation < target_range:
                    score = min(score, 0.7)
                else:
                    score = min(score, 0.4)
        
        return score
    
    def _calculate_rom_completion(self, exercise: ExerciseType, rom_data: Dict, 
                               config: Dict) -> float:
        """Calculate ROM completion score."""
        if not rom_data:
            return 0.8  # Default if no ROM data
        
        actual = rom_data.get("actual", 0)
        target = rom_data.get("target", 0)
        
        if target == 0:
            return 1.0
        
        completion = actual / target
        if completion >= 0.9:
            return 1.0
        elif completion >= 0.7:
            return 0.8
        elif completion >= 0.5:
            return 0.6
        else:
            return 0.4
    
    def _calculate_body_alignment(self, exercise: ExerciseType, angles: Dict, 
                                 config: Dict) -> float:
        """Calculate body alignment score."""
        score = 1.0
        
        # Torso lean check
        max_torso = config.get("max_torso_lean", None)
        if max_torso and "torso_lean" in angles:
            if angles["torso_lean"] > max_torso:
                penalty = (angles["torso_lean"] - max_torso) / max_torso
                score = max(0.0, 1.0 - penalty)
        
        # Hip symmetry check
        hip_sym = config.get("hip_symmetry_threshold", None)
        if hip_sym and "left_hip" in angles and "right_hip" in angles:
            hip_diff = abs(angles["left_hip"] - angles["right_hip"])
            if hip_diff > hip_sym:
                penalty = (hip_diff - hip_sym) / hip_sym
                score = max(0.0, 1.0 - penalty)
        
        return score
    
    def _calculate_stability(self, issues: List[str]) -> float:
        """Calculate stability score based on detected issues."""
        if not issues:
            return 1.0
        
        # More issues = lower stability
        issue_count = len(issues)
        if issue_count == 0:
            return 1.0
        elif issue_count == 1:
            return 0.8
        elif issue_count == 2:
            return 0.6
        elif issue_count == 3:
            return 0.4
        else:
            return 0.2

# ==================== SET TRACKING ====================

class SetTracker:
    """Tracks sets, reps per set, and set completion."""
    
    def __init__(self):
        self.current_set = 1
        self.target_reps = 10  # Default target
        self.current_reps = 0
        self.completed_sets = 0
        self.set_history = []  # List of completed sets
        self.current_set_start_time = None
    
    def set_target_reps(self, target: int):
        """Set target reps for current set."""
        if target > 0:
            self.target_reps = target
    
    def increment_rep(self):
        """Increment current rep count."""
        self.current_reps += 1
    
    def complete_set(self):
        """Mark current set as complete and start new set."""
        if self.current_reps > 0:
            self.set_history.append({
                "set_number": self.current_set,
                "reps_completed": self.current_reps,
                "target_reps": self.target_reps,
                "completion_percentage": (self.current_reps / self.target_reps) * 100
            })
            self.completed_sets += 1
            self.current_set += 1
            self.current_reps = 0
            self.current_set_start_time = None
            return True
        return False
    
    def reset(self):
        """Reset all tracking."""
        self.current_set = 1
        self.target_reps = 10
        self.current_reps = 0
        self.completed_sets = 0
        self.set_history = []
        self.current_set_start_time = None

# ==================== REST DETECTOR ====================

class RestDetector:
    """Detects when user has stopped moving for rest period."""
    
    def __init__(self, inactivity_threshold_seconds: int = 30):
        self.inactivity_threshold = inactivity_threshold_seconds
        self.last_movement_time = None
        self.in_rest = False
        self.rest_start_time = None
    
    def update_movement(self, has_movement: bool):
        """Update movement status."""
        current_time = time.time()
        
        if has_movement:
            self.last_movement_time = current_time
            if self.in_rest:
                # User moved, end rest
                self.in_rest = False
                self.rest_start_time = None
        else:
            # No movement
            if self.last_movement_time and (current_time - self.last_movement_time) > self.inactivity_threshold:
                if not self.in_rest:
                    self.in_rest = True
                    self.rest_start_time = current_time
    
    def get_rest_duration(self) -> float:
        """Get current rest duration in seconds."""
        if self.in_rest and self.rest_start_time:
            return time.time() - self.rest_start_time
        return 0.0
    
    def skip_rest(self):
        """Skip current rest period."""
        self.in_rest = False
        self.rest_start_time = None
        self.last_movement_time = time.time()

# ==================== TEMPO TRACKER ====================

class TempoTracker:
    """Tracks rep duration and calculates average tempo."""
    
    def __init__(self):
        self.rep_durations = []  # List of rep durations in seconds
        self.rep_start_time = None
        self.last_rep_time = None
    
    def start_rep(self):
        """Mark start of a rep."""
        self.rep_start_time = time.time()
    
    def end_rep(self):
        """Mark end of a rep and record duration."""
        if self.rep_start_time:
            duration = time.time() - self.rep_start_time
            self.rep_durations.append(duration)
            self.last_rep_time = time.time()
            self.rep_start_time = None
            return duration
        return 0.0
    
    def get_average_tempo(self) -> float:
        """Get average rep duration in seconds."""
        if not self.rep_durations:
            return 0.0
        return sum(self.rep_durations) / len(self.rep_durations)
    
    def get_reps_per_minute(self) -> float:
        """Calculate reps per minute based on average tempo."""
        avg_tempo = self.get_average_tempo()
        if avg_tempo > 0:
            return 60.0 / avg_tempo
        return 0.0
    
    def reset(self):
        """Reset all tracking."""
        self.rep_durations = []
        self.rep_start_time = None
        self.last_rep_time = None

# ==================== WORKOUT RESULT AGGREGATOR ====================

class WorkoutResult:
    """Aggregates workout statistics and results."""
    
    def __init__(self):
        self.exercises_performed = {}  # exercise -> {sets, reps, correct, wrong}
        self.total_sets = 0
        self.total_reps = 0
        self.total_correct_reps = 0
        self.total_wrong_reps = 0
        self.form_scores = []  # List of all form scores
        self.rep_history = []  # Detailed rep history
        self.injury_warnings = 0
        self.start_time = None
        self.end_time = None
        self.most_common_mistakes = {}  # mistake -> count
    
    def add_rep(self, exercise: str, form_score: float, is_correct: bool, 
                mistakes: List[str], angles: Dict, rep_duration: float = 0.0):
        """Add a completed rep to the workout results."""
        self.total_reps += 1
        
        if is_correct:
            self.total_correct_reps += 1
        else:
            self.total_wrong_reps += 1
        
        self.form_scores.append(form_score)
        
        # Track mistakes
        for mistake in mistakes:
            self.most_common_mistakes[mistake] = self.most_common_mistakes.get(mistake, 0) + 1
        
        # Track exercise stats
        if exercise not in self.exercises_performed:
            self.exercises_performed[exercise] = {"sets": 0, "reps": 0, "correct": 0, "wrong": 0}
        
        self.exercises_performed[exercise]["reps"] += 1
        if is_correct:
            self.exercises_performed[exercise]["correct"] += 1
        else:
            self.exercises_performed[exercise]["wrong"] += 1
        
        # Store detailed rep history
        self.rep_history.append({
            "rep_number": self.total_reps,
            "exercise": exercise,
            "form_score": form_score,
            "is_correct": is_correct,
            "mistakes": mistakes,
            "angles": angles,
            "duration": rep_duration,
            "timestamp": datetime.now().isoformat()
        })
    
    def add_set(self, exercise: str, set_number: int, reps: int):
        """Add a completed set."""
        self.total_sets += 1
        if exercise in self.exercises_performed:
            self.exercises_performed[exercise]["sets"] += 1
    
    def add_injury_warning(self):
        """Record an injury warning."""
        self.injury_warnings += 1
    
    def start_workout(self):
        """Mark workout start time."""
        self.start_time = datetime.now()
    
    def end_workout(self):
        """Mark workout end time."""
        self.end_time = datetime.now()
    
    def get_summary(self) -> Dict:
        """Get workout summary."""
        duration = None
        if self.start_time and self.end_time:
            duration = (self.end_time - self.start_time).total_seconds()
        
        avg_form_score = 0.0
        if self.form_scores:
            avg_form_score = sum(self.form_scores) / len(self.form_scores)
        
        best_rep = 0.0
        if self.form_scores:
            best_rep = max(self.form_scores)
        
        return {
            "total_exercises": len(self.exercises_performed),
            "total_sets": self.total_sets,
            "total_reps": self.total_reps,
            "correct_reps": self.total_correct_reps,
            "wrong_reps": self.total_wrong_reps,
            "average_form_score": round(avg_form_score, 1),
            "best_rep": round(best_rep, 1),
            "most_common_mistake": max(self.most_common_mistakes.items(), key=lambda x: x[1])[0] if self.most_common_mistakes else "None",
            "duration_seconds": duration,
            "injury_warnings": self.injury_warnings,
            "exercises_breakdown": self.exercises_performed
        }

# ==================== AI FEATURES ====================

class VoiceCoach:
    """AI voice coach that provides real-time verbal feedback."""
    
    def __init__(self):
        self.last_feedback_time = 0
        self.feedback_cooldown = 3
        self.last_feedback = ""
    
    def get_voice_feedback(self, exercise: ExerciseType, status: PostureStatus, 
                          issue: str, feedback_list: List[str]) -> Optional[str]:
        current_time = time.time()
        if current_time - self.last_feedback_time < self.feedback_cooldown:
            return None
        
        if status == PostureStatus.WRONG and feedback_list:
            voice_msg = feedback_list[0]
            if voice_msg != self.last_feedback:
                self.last_feedback = voice_msg
                self.last_feedback_time = current_time
                return voice_msg
        
        if "completed" in issue.lower():
            self.last_feedback_time = current_time
            return "Good rep! Keep it up!"
        
        return None

class WorkoutPlanner:
    """AI workout plan generator."""
    
    def __init__(self):
        self.plans = {
            "strength": {
                "name": "Strength Builder",
                "exercises": ["Squat", "Deadlift", "Shoulder Press"],
                "sets": 4, "reps": "6-8", "rest": 120,
                "focus": "Heavy weights, controlled tempo"
            },
            "fat_loss": {
                "name": "Fat Burner",
                "exercises": ["Squat", "Push-up", "Lunge", "Bicep Curl"],
                "sets": 3, "reps": "12-15", "rest": 60,
                "focus": "Higher reps, shorter rest"
            },
            "mobility": {
                "name": "Mobility Flow",
                "exercises": ["Squat", "Lunge", "Shoulder Press"],
                "sets": 3, "reps": "10-12", "rest": 90,
                "focus": "Full range of motion"
            }
        }
    
    def generate_plan(self, goal: str, level: str = "beginner") -> dict:
        base_plan = self.plans.get(goal, self.plans["strength"]).copy()
        if level == "beginner":
            base_plan["sets"] = max(2, base_plan["sets"] - 1)
            base_plan["rest"] += 30
        elif level == "advanced":
            base_plan["sets"] += 1
        return base_plan

class InjuryPredictor:
    """Predicts injury risk based on form patterns."""
    
    def __init__(self):
        self.form_history = []
        self.max_history = 50
    
    def add_sample(self, status: PostureStatus, angles: Dict, issue: str, timestamp: float):
        self.form_history.append({"status": status.value, "angles": angles, "issue": issue, "timestamp": timestamp})
        if len(self.form_history) > self.max_history:
            self.form_history.pop(0)
    
    def calculate_risk_score(self) -> Tuple[float, str, List[str]]:
        if len(self.form_history) < 10:
            return 0.0, "Low", ["Continue monitoring"]
        
        wrong_count = sum(1 for h in self.form_history if h["status"] == "wrong")
        wrong_ratio = wrong_count / len(self.form_history)
        
        if wrong_ratio < 0.3:
            return wrong_ratio, "Low", ["Good form consistency"]
        elif wrong_ratio < 0.6:
            return wrong_ratio, "Moderate", ["Focus on form correction"]
        else:
            return wrong_ratio, "High", ["Stop and rest", "Significant form degradation"]

class Pose3DAnalyzer:
    """3D pose and range of motion analyzer."""
    
    def __init__(self):
        self.angles_history = []
    
    def analyze_range_of_motion(self, angles: Dict) -> Dict:
        self.angles_history.append(angles)
        if len(self.angles_history) > 100:
            self.angles_history.pop(0)
        
        if len(self.angles_history) < 5:
            return {}
        
        rom_data = {}
        for angle_name in angles.keys():
            values = [frame[angle_name] for frame in self.angles_history if angle_name in frame]
            if values:
                rom_data[angle_name] = {"min": min(values), "max": max(values), "range": max(values) - min(values)}
        return rom_data
    
    def detect_fatigue(self) -> float:
        if len(self.angles_history) < 20:
            return 0.0
        
        # Compare first 10 vs last 10 frames ROM
        first_half = self.angles_history[:10]
        last_half = self.angles_history[-10:]
        
        first_ranges = []
        last_ranges = []
        
        for angle_name in first_half[0].keys():
            f_vals = [f[angle_name] for f in first_half if angle_name in f]
            l_vals = [f[angle_name] for f in last_half if angle_name in f]
            if f_vals and l_vals:
                first_ranges.append(max(f_vals) - min(f_vals))
                last_ranges.append(max(l_vals) - min(l_vals))
        
        if not first_ranges or not last_ranges:
            return 0.0
        
        avg_first = sum(first_ranges) / len(first_ranges)
        avg_last = sum(last_ranges) / len(last_ranges)
        
        if avg_first > 0:
            fatigue = 1 - (avg_last / avg_first)
            return max(0, min(1, fatigue))
        return 0.0

# ==================== FASTAPI APP ====================

app = FastAPI(
    title="AI Gym Posture Detection API",
    description="Real-time exercise posture detection and injury risk reduction using computer vision",
    version="2.0.0"
)

# Configure CORS - use environment variable or default to localhost for development
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# MediaPipe setup - Mock implementation for compatibility
class MockPoseLandmark:
    """Mock pose landmark enum"""
    NOSE = 0
    LEFT_EYE_INNER = 1
    LEFT_EYE = 2
    LEFT_EYE_OUTER = 3
    RIGHT_EYE_INNER = 4
    RIGHT_EYE = 5
    RIGHT_EYE_OUTER = 6
    LEFT_EAR = 7
    RIGHT_EAR = 8
    MOUTH_LEFT = 9
    MOUTH_RIGHT = 10
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_PINKY = 17
    RIGHT_PINKY = 18
    LEFT_INDEX = 19
    RIGHT_INDEX = 20
    LEFT_THUMB = 21
    RIGHT_THUMB = 22
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    LEFT_HEEL = 29
    RIGHT_HEEL = 30
    LEFT_FOOT_INDEX = 31
    RIGHT_FOOT_INDEX = 32

class MockDrawingSpec:
    def __init__(self, color=(0, 255, 0), thickness=2, circle_radius=2):
        self.color = color
        self.thickness = thickness
        self.circle_radius = circle_radius

class MockMPDrawing:
    @staticmethod
    def draw_landmarks(image, landmark_list, connections=None, 
                      landmark_drawing_spec=None, connection_drawing_spec=None):
        # Mock - doesn't actually draw anything
        pass

class MockMPSolutions:
    class pose:
        PoseLandmark = MockPoseLandmark
        POSE_CONNECTIONS = []
        
        def __init__(self, **kwargs):
            pass
        
        def __enter__(self):
            return self
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            return False
        
        def process(self, image):
            return MockResults()
    
    drawing_utils = MockMPDrawing()
    drawing_styles = type('drawing_styles', (), {
        'get_default_pose_landmarks_style': lambda: None
    })()

class MockResults:
    def __init__(self):
        self.pose_landmarks = None

# Try to use real MediaPipe, fallback to mock
try:
    import mediapipe as mp
    HAS_MEDIAPIPE = True
    print("MediaPipe loaded successfully")
    
    # Define global MediaPipe references
    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
except (AttributeError, ImportError) as e:
    print(f"MediaPipe not available ({e}), using mock implementation")
    mp = None
    HAS_MEDIAPIPE = False
    # Use mock implementations
    mp_pose = MockMPSolutions.pose
    mp_drawing = MockMPSolutions.drawing_utils
    mp_drawing_styles = MockMPSolutions.drawing_styles

# Global state
class AppState:
    def __init__(self):
        self.running = False
        self.cap = None
        self.latest_frame = None
        self.latest_frame_clean = None  # Video without overlays
        self.lock = threading.Lock()
        self.worker_thread = None
        self.classifier = ExerciseClassifier()
        self.validator = FormValidator()
        self.rep_counter = RepCounter()
        self.voice_coach = VoiceCoach()
        self.workout_planner = WorkoutPlanner()
        self.injury_predictor = InjuryPredictor()
        self.pose3d_analyzer = Pose3DAnalyzer()
        
        # Workout Intelligence Layer
        self.form_score_calculator = FormScoreCalculator()
        self.set_tracker = SetTracker()
        self.rest_detector = RestDetector(inactivity_threshold_seconds=30)
        self.tempo_tracker = TempoTracker()
        self.workout_result = WorkoutResult()
        
        self.current_session_id = None
        self.current_exercise = ExerciseType.UNKNOWN
        self.start_time = None
        self.injury_alerts = 0
        self.connected_clients: List[WebSocket] = []
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.show_overlay = True  # Toggle for video overlays
        
        # Settings
        self.voice_coach_enabled = True
        self.voice_coach_cooldown = 3
        self.risk_warnings_enabled = True
        
        # Rep-specific data
        self.current_rep_score = 0.0
        self.current_rep_start_time = None
        self.last_rep_data = None
        
    def reset_session(self):
        self.rep_counter.reset()
        self.validator.reset_counters()
        self.set_tracker.reset()
        self.tempo_tracker.reset()
        self.rest_detector.skip_rest()
        self.workout_result = WorkoutResult()
        self.current_session_id = None
        self.current_exercise = ExerciseType.UNKNOWN
        self.start_time = None
        self.injury_alerts = 0
        self.current_rep_score = 0.0
        self.current_rep_start_time = None
        self.last_rep_data = None

state = AppState()

# ==================== WEBSOCKET MANAGER ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# ==================== FIREBASE FUNCTIONS ====================

def save_posture_log(data: PostureData):
    """Save posture data to Firestore."""
    try:
        # Update latest state
        db.collection("postureLogs").document("latest").set(
            asdict(data),
            merge=True
        )
        
        # Log wrong posture events
        if data.status == "wrong":
            db.collection("postureHistory").add(asdict(data))
    except Exception as e:
        print(f"Firestore write error: {e}")

def save_session_summary(session: SessionData):
    """Save session summary to Firestore."""
    try:
        db.collection("sessions").document(session.session_id).set(asdict(session))
    except Exception as e:
        print(f"Session save error: {e}")

# ==================== VIDEO PROCESSING ====================

def process_frame(frame, pose):
    """Process a single frame and return annotated frame + posture data."""
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(frame_rgb)
    
    posture_data = None
    
    if results.pose_landmarks:
        lm = results.pose_landmarks.landmark
        
        # Classify exercise
        exercise = state.classifier.classify(lm)
        
        # Validate form
        status, issue, feedback, angles = state.validator.validate(exercise, lm)
        
        # Update rep counter
        rep_completed = state.rep_counter.update(exercise, lm, status, mp_pose)
        
        # Track exercise changes
        if exercise != state.current_exercise:
            if state.current_exercise != ExerciseType.UNKNOWN:
                # Save summary of previous exercise
                pass  # Could save per-exercise stats here
            state.current_exercise = exercise
            state.validator.reset_counters()
            state.rep_counter.reset()
        
        # Count injury alerts
        if status == PostureStatus.WRONG and "INJURY" in issue.upper():
            state.injury_alerts += 1
        
        # ═══════════════════════════════════════════════════════
        #  PREMIUM GRAPHICAL AVATAR RENDERER
        #  Replaces default MediaPipe skeleton with a cool neon
        #  "graphical man" that color-codes every body segment
        #  based on posture correctness.
        # ═══════════════════════════════════════════════════════

        h, w = frame.shape[:2]
        is_correct = (status == PostureStatus.CORRECT)

        # ── Colour palette ──────────────────────────────────────
        # Each segment gets its own colour; overall tint shifts
        # between green (correct) and red (wrong).
        NEON_GREEN  = (57,  255, 20)
        NEON_RED    = (0,   60,  255)
        NEON_BLUE   = (255, 100, 10)
        NEON_YELLOW = (0,   220, 255)
        NEON_PURPLE = (220, 0,   255)
        NEON_CYAN   = (255, 220, 0)

        STATUS_OK  = (57,  255, 20)
        STATUS_BAD = (0,   60,  255)
        seg_color  = STATUS_OK if is_correct else STATUS_BAD

        def pt(idx):
            """Return (x, y) pixel coords for landmark index."""
            lnd = lm[idx]
            return (int(lnd.x * w), int(lnd.y * h))

        def vis(idx, thresh=0.4):
            """True if landmark visibility is above threshold."""
            return lm[idx].visibility > thresh

        def glow_line(img, p1, p2, color, thickness=4, layers=3):
            """Draw a glowing line by layering decreasing-alpha copies."""
            for i in range(layers, 0, -1):
                alpha = 0.15 * i
                t = thickness + (layers - i) * 3
                overlay = img.copy()
                cv2.line(overlay, p1, p2, color, t, cv2.LINE_AA)
                cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)
            cv2.line(img, p1, p2, color, thickness, cv2.LINE_AA)

        def glow_circle(img, center, radius, color, thickness=-1, layers=3):
            """Draw a glowing filled circle."""
            for i in range(layers, 0, -1):
                alpha = 0.12 * i
                r = radius + (layers - i) * 4
                overlay = img.copy()
                cv2.circle(overlay, center, r, color, -1, cv2.LINE_AA)
                cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)
            cv2.circle(img, center, radius, color, thickness, cv2.LINE_AA)
            # White core highlight
            cv2.circle(img, center, max(2, radius // 3), (255, 255, 255), -1, cv2.LINE_AA)

        # Segment definitions: (from_idx, to_idx, color)
        SEGMENTS = [
            # Torso
            (11, 12, NEON_CYAN),    # shoulders
            (11, 23, NEON_CYAN),    # L torso
            (12, 24, NEON_CYAN),    # R torso
            (23, 24, NEON_CYAN),    # hips
            # Left arm
            (11, 13, NEON_PURPLE),  # L upper arm
            (13, 15, NEON_PURPLE),  # L forearm
            # Right arm
            (12, 14, NEON_PURPLE),  # R upper arm
            (14, 16, NEON_PURPLE),  # R forearm
            # Left leg
            (23, 25, seg_color),    # L thigh
            (25, 27, seg_color),    # L shin
            (27, 31, seg_color),    # L foot
            # Right leg
            (24, 26, seg_color),    # R thigh
            (26, 28, seg_color),    # R shin
            (28, 32, seg_color),    # R foot
        ]

        # ── 1. Draw all limb segments ───────────────────────────
        for (a, b, col) in SEGMENTS:
            if vis(a) and vis(b):
                glow_line(frame, pt(a), pt(b), col, thickness=4)

        # ── 2. Filled torso body polygon ───────────────────────
        if all(vis(i) for i in [11, 12, 24, 23]):
            ls, rs = pt(11), pt(12)
            rh, lh = pt(24), pt(23)
            # Widen torso slightly for a body-shape feel
            dx = int((rs[0] - ls[0]) * 0.12)
            torso_pts = np.array([
                [ls[0] - dx, ls[1]],
                [rs[0] + dx, rs[1]],
                [rh[0] + dx, rh[1]],
                [lh[0] - dx, lh[1]]
            ], dtype=np.int32)
            overlay_t = frame.copy()
            cv2.fillPoly(overlay_t, [torso_pts], seg_color)
            cv2.addWeighted(overlay_t, 0.18, frame, 0.82, 0, frame)
            cv2.polylines(frame, [torso_pts], True, seg_color, 2, cv2.LINE_AA)

        # ── 3. Filled leg polygons ──────────────────────────────
        for hip_i, knee_i, ankle_i in [(23, 25, 27), (24, 26, 28)]:
            if vis(hip_i) and vis(knee_i) and vis(ankle_i):
                hip_p, knee_p, ank_p = pt(hip_i), pt(knee_i), pt(ankle_i)
                offset = 10
                leg_pts = np.array([
                    [hip_p[0] - offset, hip_p[1]],
                    [hip_p[0] + offset, hip_p[1]],
                    [knee_p[0] + offset, knee_p[1]],
                    [ankle_p[0] + offset, ankle_p[1]],
                    [ankle_p[0] - offset, ankle_p[1]],
                    [knee_p[0] - offset, knee_p[1]],
                ], dtype=np.int32)
                ov = frame.copy()
                cv2.fillPoly(ov, [leg_pts], seg_color)
                cv2.addWeighted(ov, 0.15, frame, 0.85, 0, frame)

        # ── 4. Joint spheres ────────────────────────────────────
        JOINT_MAP = {
            # (index, radius, color)
            11: (8,  NEON_CYAN),   # L shoulder
            12: (8,  NEON_CYAN),   # R shoulder
            13: (7,  NEON_PURPLE), # L elbow
            14: (7,  NEON_PURPLE), # R elbow
            15: (6,  NEON_PURPLE), # L wrist
            16: (6,  NEON_PURPLE), # R wrist
            23: (8,  NEON_CYAN),   # L hip
            24: (8,  NEON_CYAN),   # R hip
            25: (8,  seg_color),   # L knee
            26: (8,  seg_color),   # R knee
            27: (7,  seg_color),   # L ankle
            28: (7,  seg_color),   # R ankle
        }
        for idx, (radius, col) in JOINT_MAP.items():
            if vis(idx):
                glow_circle(frame, pt(idx), radius, col)

        # ── 5. Head (filled ellipse with face dots) ─────────────
        if vis(0):   # nose
            nose   = pt(0)
            # Estimate head size from shoulder width
            if vis(11) and vis(12):
                shoulder_w = abs(pt(12)[0] - pt(11)[0])
                head_r_x = max(18, int(shoulder_w * 0.28))
                head_r_y = max(22, int(shoulder_w * 0.36))
            else:
                head_r_x, head_r_y = 22, 28
            head_cx = nose[0]
            head_cy = nose[1] - head_r_y // 2

            # Glow halo
            ov = frame.copy()
            cv2.ellipse(ov, (head_cx, head_cy), (head_r_x + 8, head_r_y + 8),
                        0, 0, 360, seg_color, -1, cv2.LINE_AA)
            cv2.addWeighted(ov, 0.15, frame, 0.85, 0, frame)

            # Head fill
            ov2 = frame.copy()
            cv2.ellipse(ov2, (head_cx, head_cy), (head_r_x, head_r_y),
                        0, 0, 360, (30, 30, 30), -1, cv2.LINE_AA)
            cv2.addWeighted(ov2, 0.7, frame, 0.3, 0, frame)

            # Head outline
            cv2.ellipse(frame, (head_cx, head_cy), (head_r_x, head_r_y),
                        0, 0, 360, seg_color, 2, cv2.LINE_AA)

            # Eyes
            eye_y = head_cy - head_r_y // 5
            eye_dx = head_r_x // 3
            for ex_off in [-eye_dx, eye_dx]:
                cv2.circle(frame, (head_cx + ex_off, eye_y), 3, (255, 255, 255), -1, cv2.LINE_AA)
                cv2.circle(frame, (head_cx + ex_off, eye_y), 2, seg_color, -1, cv2.LINE_AA)

            # Mouth arc
            cv2.ellipse(frame, (head_cx, head_cy + head_r_y // 4),
                        (head_r_x // 3, head_r_y // 6),
                        0, 0, 180,
                        STATUS_OK if is_correct else STATUS_BAD, 1, cv2.LINE_AA)

        # ═══════════════════════════════════════════════════════
        #  PREMIUM HUD OVERLAY
        # ═══════════════════════════════════════════════════════

        # ── Top-left: exercise + status panel ──────────────────
        panel_w, panel_h = 360, 100
        ov = frame.copy()
        cv2.rectangle(ov, (10, 10), (10 + panel_w, 10 + panel_h), (10, 10, 25), -1)
        cv2.addWeighted(ov, 0.75, frame, 0.25, 0, frame)
        # Accent bar
        cv2.rectangle(frame, (10, 10), (14, 10 + panel_h), seg_color, -1)
        cv2.rectangle(frame, (10, 10), (10 + panel_w, 10 + panel_h), seg_color, 1)

        # Exercise label
        ex_label = exercise.value.upper()
        cv2.putText(frame, ex_label, (22, 45),
                    cv2.FONT_HERSHEY_DUPLEX, 0.85, (255, 255, 255), 1, cv2.LINE_AA)

        # Status badge
        badge_text = "CORRECT FORM" if is_correct else "WRONG FORM"
        badge_color = STATUS_OK if is_correct else STATUS_BAD
        cv2.putText(frame, badge_text, (22, 80),
                    cv2.FONT_HERSHEY_DUPLEX, 0.65, badge_color, 1, cv2.LINE_AA)

        # ── Top-right: rep counter panel ───────────────────────
        rp_x = w - 180
        ov = frame.copy()
        cv2.rectangle(ov, (rp_x, 10), (w - 10, 130), (10, 10, 25), -1)
        cv2.addWeighted(ov, 0.75, frame, 0.25, 0, frame)
        cv2.rectangle(frame, (rp_x, 10), (w - 10, 130), NEON_CYAN, 1)

        # Big rep number
        rep_str = str(state.rep_counter.count)
        (tw, th), _ = cv2.getTextSize(rep_str, cv2.FONT_HERSHEY_DUPLEX, 2.2, 2)
        cx_r = rp_x + (w - 10 - rp_x) // 2 - tw // 2
        cv2.putText(frame, rep_str, (cx_r, 80),
                    cv2.FONT_HERSHEY_DUPLEX, 2.2, NEON_YELLOW, 2, cv2.LINE_AA)
        cv2.putText(frame, "REPS", (cx_r + 4, 110),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 180, 180), 1, cv2.LINE_AA)

        # Good / Bad split below rep box
        ov = frame.copy()
        cv2.rectangle(ov, (rp_x, 135), (w - 10, 170), (10, 10, 25), -1)
        cv2.addWeighted(ov, 0.75, frame, 0.25, 0, frame)
        cv2.putText(frame, f"GOOD {state.rep_counter.correct_count}",
                    (rp_x + 6, 158), cv2.FONT_HERSHEY_SIMPLEX, 0.5, STATUS_OK, 1, cv2.LINE_AA)
        cv2.putText(frame, f"BAD {state.rep_counter.wrong_count}",
                    (rp_x + 90, 158), cv2.FONT_HERSHEY_SIMPLEX, 0.5, STATUS_BAD, 1, cv2.LINE_AA)

        # ── Bottom: issue / feedback banner ────────────────────
        if issue and issue != "Good form!":
            msg = issue[:65]
            ov = frame.copy()
            cv2.rectangle(ov, (0, h - 58), (w, h), (8, 8, 20), -1)
            cv2.addWeighted(ov, 0.82, frame, 0.18, 0, frame)
            # Coloured left accent
            cv2.rectangle(frame, (0, h - 58), (6, h), STATUS_BAD, -1)
            cv2.rectangle(frame, (0, h - 58), (w, h), STATUS_BAD, 1)
            cv2.putText(frame, f"  {msg}", (16, h - 22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.68, (255, 200, 200), 1, cv2.LINE_AA)
            # Feedback tip below issue
            if feedback:
                cv2.putText(frame, f"  TIP: {feedback[0][:60]}", (16, h - 4),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.48, (180, 220, 255), 1, cv2.LINE_AA)
        else:
            ov = frame.copy()
            cv2.rectangle(ov, (0, h - 40), (w, h), (8, 20, 8), -1)
            cv2.addWeighted(ov, 0.72, frame, 0.28, 0, frame)
            cv2.rectangle(frame, (0, h - 40), (6, h), STATUS_OK, -1)
            cv2.putText(frame, "  PERFECT FORM — Keep it up!", (16, h - 14),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.72, STATUS_OK, 1, cv2.LINE_AA)

        # ── Scan-line effect (subtle) ───────────────────────────
        for y_sl in range(0, h, 8):
            cv2.line(frame, (0, y_sl), (w, y_sl), (0, 0, 0), 1)
        # reduce intensity of scan-lines
        ov = frame.copy()
        cv2.addWeighted(frame, 0.93, np.zeros_like(frame), 0.07, 0, frame)

        # Create posture data object
        posture_data = PostureData(
            exercise=exercise.value,
            status=status.value,
            issue=issue,
            rep_count=state.rep_counter.count,
            session_id=state.current_session_id or "",
            timestamp=datetime.now().isoformat(),
            angles=angles,
            feedback=feedback
        )

    
    return frame, posture_data

def worker_loop():
    """Main processing loop running in separate thread."""
    # Try different camera backends for Windows compatibility
    # Try DirectShow first, then fallback to MSMF, then default
    for backend in [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]:
        state.cap = cv2.VideoCapture(0, backend)
        if state.cap.isOpened():
            print(f"Camera opened with backend: {backend}")
            break
        state.cap.release()
    
    if not state.cap or not state.cap.isOpened():
        print("Failed to open camera with any backend")
        state.running = False
        return
    
    # Lower resolution for better performance
    state.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    state.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    state.cap.set(cv2.CAP_PROP_FPS, 30)
    state.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce latency
    
    last_posture_key = None
    last_save_time = 0
    frame_count = 0
    
    # Initialize MediaPipe Pose if available
    pose = None
    if HAS_MEDIAPIPE and mp:
        pose = mp.solutions.pose.Pose(
            model_complexity=0,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
    
    try:
        while state.running:
            ret, frame = state.cap.read()
            if not ret:
                time.sleep(0.01)
                continue
            
            # Skip frames for better performance (process every 3rd frame)
            frame_count += 1
            if frame_count % 3 != 0:
                # Still encode and stream the raw frame
                ret, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                if ret:
                    with state.lock:
                        state.latest_frame_clean = jpeg.tobytes()
                continue
            
            # Process frame with MediaPipe if available
            results = None
            if pose:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(frame_rgb)

            # Create clean frame (raw camera, no overlay)
            clean_frame = frame.copy()

            # Create frame with MediaPipe skeleton overlay
            annotated_frame = frame.copy()
            if results and results.pose_landmarks:
                # Draw MediaPipe skeleton with custom styling
                mp.solutions.drawing_utils.draw_landmarks(
                    annotated_frame,
                    results.pose_landmarks,
                    mp.solutions.pose.POSE_CONNECTIONS,
                    landmark_drawing_spec=mp.solutions.drawing_styles.get_default_pose_landmarks_style(),
                    connection_drawing_spec=mp.solutions.drawing_styles.get_default_pose_connections_style()
                )

            # Encode and store clean frame FIRST (for streaming)
            ret_clean, jpeg_clean = cv2.imencode('.jpg', clean_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if ret_clean:
                with state.lock:
                    state.latest_frame_clean = jpeg_clean.tobytes()

            # Encode and store annotated frame (with skeleton)
            ret_annotated, jpeg_annotated = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if ret_annotated:
                with state.lock:
                    state.latest_frame = jpeg_annotated.tobytes()
            
            # Process posture data if landmarks detected
            posture_data = None
            if results and results.pose_landmarks:
                lm = results.pose_landmarks.landmark
                
                # Classify exercise
                exercise = state.classifier.classify(lm)
                
                # Validate form
                status, issue, feedback, angles = state.validator.validate(exercise, lm)
                
                # Update rep counter
                rep_completed = state.rep_counter.update(exercise, lm, status, mp if HAS_MEDIAPIPE else None)
                
                # Calculate form score
                state.current_rep_score = state.form_score_calculator.calculate_form_score(
                    exercise, angles, feedback
                )
                
                # Track rep completion
                if rep_completed:
                    # Calculate rep duration
                    rep_duration = state.tempo_tracker.end_rep()
                    
                    # Add to workout result
                    state.workout_result.add_rep(
                        exercise.value,
                        state.current_rep_score,
                        status == PostureStatus.CORRECT,
                        feedback,
                        angles,
                        rep_duration
                    )
                    
                    # Update set tracker
                    state.set_tracker.increment_rep()
                    
                    # Check if set is complete
                    if state.set_tracker.current_reps >= state.set_tracker.target_reps:
                        state.set_tracker.complete_set()
                        state.workout_result.add_set(
                            exercise.value,
                            state.set_tracker.current_set - 1,
                            state.set_tracker.current_reps
                        )
                else:
                    # Track rep start for tempo
                    if state.rep_counter.state == "down" and state.tempo_tracker.rep_start_time is None:
                        state.tempo_tracker.start_rep()
                
                # Track exercise changes
                if exercise != state.current_exercise:
                    state.current_exercise = exercise
                    state.validator.reset_counters()
                    state.rep_counter.reset()
                    state.set_tracker.reset()
                    state.tempo_tracker.reset()
                
                # Update rest detector based on movement
                has_movement = (exercise != ExerciseType.UNKNOWN and 
                              state.rep_counter.state != "idle")
                state.rest_detector.update_movement(has_movement)
                
                # Count injury alerts
                if status == PostureStatus.WRONG and "INJURY" in issue.upper():
                    state.injury_alerts += 1
                    state.workout_result.add_injury_warning()
                
                # ══════════════════════════════════════════════════════
                #  INTEGRATE ADVANCED AI FEATURES
                # ══════════════════════════════════════════════════════
                
                # Voice Coach feedback
                voice_feedback = None
                if state.voice_coach_enabled and state.voice_coach:
                    voice_feedback = state.voice_coach.get_voice_feedback(
                        exercise, status, issue, feedback
                    )
                
                # Injury Predictor - track form patterns
                if state.injury_predictor:
                    state.injury_predictor.add_sample(
                        status, angles, issue, time.time()
                    )
                
                # ROM Analysis
                rom_data = {}
                if state.pose3d_analyzer:
                    rom_data = state.pose3d_analyzer.analyze_range_of_motion(angles)
                
                # Fatigue detection
                fatigue_score = 0.0
                if state.pose3d_analyzer:
                    fatigue_score = state.pose3d_analyzer.detect_fatigue()
                
                # ══════════════════════════════════════════════════════
                #  TRIANGULATED BODY MESH  (AR body-scan wireframe)
                #  - Thin neon-green triangles across face + body
                #  - Small glowing dots at every landmark (all 33)
                #  - Colour shifts green→red based on posture status
                # ══════════════════════════════════════════════════════
                overlay_frame = frame.copy()
                h, w = overlay_frame.shape[:2]
                is_correct = (status == PostureStatus.CORRECT)

                # ── Colour definitions ──────────────────────────────
                MESH_COL   = (57, 255, 20)   if is_correct else (0, 80, 255)   # neon green / red
                DOT_COL    = (200, 80, 255)                                      # purple landmark dots
                DOT_WHITE  = (255, 255, 255)                                     # dot core
                STATUS_OK  = (57,  255, 20)
                STATUS_BAD = (0,   60,  255)
                HUD_CYAN   = (255, 220, 0)
                HUD_YELLOW = (0,   220, 255)
                seg_color  = STATUS_OK if is_correct else STATUS_BAD

                # ── Helper: pixel coords & visibility ──────────────
                def _p(i):
                    return (int(lm[i].x * w), int(lm[i].y * h))

                def _v(i, t=0.35):
                    try:    return lm[i].visibility > t
                    except: return False

                # ── Helper: draw one thin glow-mesh line ───────────
                def mesh_line(p1, p2, col=MESH_COL, t=1):
                    # Soft outer glow
                    glow = overlay_frame.copy()
                    cv2.line(glow, p1, p2, col, t + 3, cv2.LINE_AA)
                    cv2.addWeighted(glow, 0.2, overlay_frame, 0.8, 0, overlay_frame)
                    # Crisp core line
                    cv2.line(overlay_frame, p1, p2, col, t, cv2.LINE_AA)

                # ── Helper: filled translucent triangle ────────────
                def mesh_tri(a, b, c, col=MESH_COL, alpha=0.07):
                    if _v(a) and _v(b) and _v(c):
                        pts = np.array([_p(a), _p(b), _p(c)], np.int32)
                        fill = overlay_frame.copy()
                        cv2.fillPoly(fill, [pts], col)
                        cv2.addWeighted(fill, alpha, overlay_frame, 1-alpha, 0, overlay_frame)
                        mesh_line(_p(a), _p(b))
                        mesh_line(_p(b), _p(c))
                        mesh_line(_p(c), _p(a))

                # ═══════════════════════════════════════════════════
                #  MESH TRIANGLES  (MediaPipe Pose landmark indices)
                #
                #  0=nose  1=l_eye_in  2=l_eye  3=l_eye_out  4=r_eye_in
                #  5=r_eye  6=r_eye_out  7=l_ear  8=r_ear  9=l_mouth
                #  10=r_mouth  11=l_shoulder  12=r_shoulder
                #  13=l_elbow  14=r_elbow  15=l_wrist  16=r_wrist
                #  17=l_pinky  18=r_pinky  19=l_index  20=r_index
                #  21=l_thumb  22=r_thumb  23=l_hip  24=r_hip
                #  25=l_knee  26=r_knee  27=l_ankle  28=r_ankle
                #  29=l_heel  30=r_heel  31=l_foot  32=r_foot
                # ═══════════════════════════════════════════════════

                TRIS = [
                    # ── Face ────────────────────────────────────────
                    (0, 1, 4),   # nose ↔ inner eyes
                    (0, 1, 9),   # nose ↔ left eye ↔ left mouth
                    (0, 4, 10),  # nose ↔ right eye ↔ right mouth
                    (9, 10, 0),  # mouth ↔ nose
                    (1, 2, 7),   # left eye ↔ ear
                    (4, 5, 8),   # right eye ↔ ear
                    (2, 3, 7),   # outer left eye ↔ ear
                    (5, 6, 8),   # outer right eye ↔ ear
                    (7, 9, 11),  # left ear ↔ mouth ↔ shoulder (neck L)
                    (8, 10, 12), # right ear ↔ mouth ↔ shoulder (neck R)
                    (9, 10, 11), # mouth ↔ left shoulder
                    (9, 10, 12), # mouth ↔ right shoulder
                    # ── Chest / torso ───────────────────────────────
                    (11, 12, 23),  # shoulders ↔ left hip
                    (12, 23, 24),  # shoulder ↔ hips
                    (11, 23, 24),  # shoulder ↔ hips cross
                    (11, 12, 24),  # shoulders ↔ right hip
                    # ── Left arm (shoulder→elbow→wrist→hand) ────────
                    (11, 13, 23),  # shoulder ↔ elbow ↔ hip (upper)
                    (11, 13, 15),  # shoulder ↔ elbow ↔ wrist
                    (13, 15, 17),  # elbow ↔ wrist ↔ pinky
                    (13, 15, 19),  # elbow ↔ wrist ↔ index
                    (15, 17, 19),  # hand fan
                    (15, 19, 21),  # hand fan
                    # ── Right arm ────────────────────────────────────
                    (12, 14, 24),
                    (12, 14, 16),
                    (14, 16, 18),
                    (14, 16, 20),
                    (16, 18, 20),
                    (16, 20, 22),
                    # ── Left leg (hip→knee→ankle→foot) ──────────────
                    (11, 23, 25),  # shoulder ↔ hip ↔ knee (upper)
                    (23, 25, 24),  # hip ↔ knee cross
                    (23, 25, 27),  # hip ↔ knee ↔ ankle
                    (25, 27, 29),  # knee ↔ ankle ↔ heel
                    (27, 29, 31),  # ankle ↔ heel ↔ foot
                    (29, 31, 27),  # foot detail
                    # ── Right leg ────────────────────────────────────
                    (12, 24, 26),
                    (24, 26, 23),
                    (24, 26, 28),
                    (26, 28, 30),
                    (28, 30, 32),
                    (30, 32, 28),
                ]

                # Draw all triangles
                for (a, b, c) in TRIS:
                    mesh_tri(a, b, c)

                # ── Landmark dots (all 33 points) ──────────────────
                # Large joints get bigger dots
                BIG_JOINTS   = {11,12,13,14,23,24,25,26}  # r=5
                SMALL_JOINTS = set(range(33)) - BIG_JOINTS  # r=3

                for i in range(33):
                    if not _v(i, t=0.25): continue
                    px = _p(i)
                    r = 5 if i in BIG_JOINTS else 3
                    # Outer glow
                    gv = overlay_frame.copy()
                    cv2.circle(gv, px, r + 5, DOT_COL, -1, cv2.LINE_AA)
                    cv2.addWeighted(gv, 0.3, overlay_frame, 0.7, 0, overlay_frame)
                    # Filled dot
                    cv2.circle(overlay_frame, px, r, DOT_COL, -1, cv2.LINE_AA)
                    # White core
                    cv2.circle(overlay_frame, px, max(1, r-2), DOT_WHITE, -1, cv2.LINE_AA)

                # ═══════════════════════════════════════════════════
                #  PREMIUM HUD OVERLAY
                # ═══════════════════════════════════════════════════

                # Top-left: exercise + form panel
                pov = overlay_frame.copy()
                cv2.rectangle(pov, (10,10), (370,118), (6,6,18), -1)
                cv2.addWeighted(pov, 0.78, overlay_frame, 0.22, 0, overlay_frame)
                cv2.rectangle(overlay_frame, (10,10), (14,118), seg_color, -1)
                cv2.rectangle(overlay_frame, (10,10), (370,118), seg_color, 1)
                cv2.putText(overlay_frame, exercise.value.upper(), (22,50),
                            cv2.FONT_HERSHEY_DUPLEX, 0.88, (255,255,255), 1, cv2.LINE_AA)
                cv2.putText(overlay_frame,
                            "✓  CORRECT FORM" if is_correct else "✗  WRONG FORM",
                            (22,86), cv2.FONT_HERSHEY_DUPLEX, 0.65, seg_color, 1, cv2.LINE_AA)

                # Top-right: rep counter
                rpx = w - 178
                pov = overlay_frame.copy()
                cv2.rectangle(pov, (rpx,10), (w-10,138), (6,6,18), -1)
                cv2.addWeighted(pov, 0.78, overlay_frame, 0.22, 0, overlay_frame)
                cv2.rectangle(overlay_frame, (rpx,10), (w-10,138), HUD_CYAN, 1)
                rs_str = str(state.rep_counter.count)
                (tw2,_),_ = cv2.getTextSize(rs_str, cv2.FONT_HERSHEY_DUPLEX, 2.1, 2)
                crx = rpx + (w-10-rpx)//2 - tw2//2
                cv2.putText(overlay_frame, rs_str, (crx,88),
                            cv2.FONT_HERSHEY_DUPLEX, 2.1, HUD_YELLOW, 2, cv2.LINE_AA)
                cv2.putText(overlay_frame, "REPS", (crx+2,114),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.43, (160,160,160), 1, cv2.LINE_AA)
                pov2 = overlay_frame.copy()
                cv2.rectangle(pov2,(rpx,141),(w-10,170),(6,6,18),-1)
                cv2.addWeighted(pov2,0.75,overlay_frame,0.25,0,overlay_frame)
                cv2.putText(overlay_frame, f"GOOD {state.rep_counter.correct_count}",
                            (rpx+5,161), cv2.FONT_HERSHEY_SIMPLEX, 0.48, STATUS_OK, 1, cv2.LINE_AA)
                cv2.putText(overlay_frame, f"BAD {state.rep_counter.wrong_count}",
                            (rpx+90,161), cv2.FONT_HERSHEY_SIMPLEX, 0.48, STATUS_BAD, 1, cv2.LINE_AA)

                # Bottom banner
                if issue and issue != "Good form!":
                    bov = overlay_frame.copy()
                    cv2.rectangle(bov, (0,h-62),(w,h),(6,6,18),-1)
                    cv2.addWeighted(bov, 0.82, overlay_frame, 0.18, 0, overlay_frame)
                    cv2.rectangle(overlay_frame,(0,h-62),(6,h),STATUS_BAD,-1)
                    cv2.rectangle(overlay_frame,(0,h-62),(w,h),STATUS_BAD,1)
                    cv2.putText(overlay_frame, f"  {issue[:66]}", (14,h-30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.62,(255,200,200),1,cv2.LINE_AA)
                    if feedback:
                        cv2.putText(overlay_frame, f"  TIP: {feedback[0][:62]}", (14,h-8),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.46,(180,220,255),1,cv2.LINE_AA)
                else:
                    bov = overlay_frame.copy()
                    cv2.rectangle(bov,(0,h-44),(w,h),(6,18,6),-1)
                    cv2.addWeighted(bov,0.72,overlay_frame,0.28,0,overlay_frame)
                    cv2.rectangle(overlay_frame,(0,h-44),(6,h),STATUS_OK,-1)
                    cv2.putText(overlay_frame,"  PERFECT FORM — Keep it up!",(14,h-16),
                                cv2.FONT_HERSHEY_SIMPLEX,0.7,STATUS_OK,1,cv2.LINE_AA)

                # Encode overlay frame
                ret_overlay, jpeg_overlay = cv2.imencode('.jpg', overlay_frame,
                                                          [cv2.IMWRITE_JPEG_QUALITY, 78])
                if ret_overlay:
                    with state.lock:
                        state.latest_frame = jpeg_overlay.tobytes()


                
                # Create posture data with workout intelligence
                posture_data = PostureData(
                    exercise=exercise.value,
                    status=status.value,
                    issue=issue,
                    rep_count=state.rep_counter.count,
                    session_id=state.current_session_id or "",
                    timestamp=datetime.now().isoformat(),
                    angles=angles,
                    feedback=feedback
                )
                
                # Enhanced data for WebSocket
                enhanced_data = asdict(posture_data)
                enhanced_data.update({
                    "form_score": state.current_rep_score,
                    "current_set": state.set_tracker.current_set,
                    "set_reps": state.set_tracker.current_reps,
                    "target_reps": state.set_tracker.target_reps,
                    "in_rest": state.rest_detector.in_rest,
                    "rest_duration": state.rest_detector.get_rest_duration(),
                    "average_tempo": state.tempo_tracker.get_average_tempo(),
                    "confidence": state.classifier.get_confidence(),
                    "injury_warnings": state.injury_alerts,
                    # Advanced AI features
                    "voice_feedback": voice_feedback,
                    "rom_data": rom_data,
                    "fatigue_score": fatigue_score
                })
            
            # Save to Firebase periodically (non-blocking)
            if posture_data:
                current_key = (posture_data.exercise, posture_data.status, posture_data.issue)
                current_time = time.time()
                
                if current_key != last_posture_key or (current_time - last_save_time) > 2:
                    # Run in thread pool to avoid blocking
                    try:
                        state.executor.submit(save_posture_log, posture_data)
                    except:
                        pass
                    last_posture_key = current_key
                    last_save_time = current_time
                
                # Broadcast to WebSocket (fire and forget)
                if manager.active_connections:
                    try:
                        # Create task in main event loop
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        loop.run_until_complete(manager.broadcast({
                            "type": "posture_update",
                            "data": enhanced_data
                        }))
                        loop.close()
                    except:
                        pass
            
            # Limit to ~10 FPS for AI processing
            time.sleep(0.1)
    finally:
        # Cleanup MediaPipe Pose
        if pose:
            pose.close()
    
    if state.cap:
        state.cap.release()
    state.cap = None

# ==================== API ENDPOINTS ====================

@app.get("/")
def root():
    """Serve the frontend HTML."""
    frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend-vanilla', 'index.html')
    if os.path.exists(frontend_path):
        return FileResponse(frontend_path)
    return {
        "message": "AI Gym Posture Detection API",
        "version": "2.0.0",
        "team": "Vansh Bhardwaj (2024182457), Sehran Fayaz (2024121805)",
        "institution": "Sharda University - SSCSE",
        "note": "Frontend not found. Place frontend-vanilla/index.html in project root."
    }

@app.get("/status")
async def get_status():
    """Get current system status."""
    return {
        "running": state.running,
        "session_id": state.current_session_id,
        "exercise": state.current_exercise.value if state.current_exercise else None,
        "reps": state.rep_counter.count,
        "correct_reps": state.rep_counter.correct_count,
        "wrong_reps": state.rep_counter.wrong_count,
        "injury_alerts": state.injury_alerts
    }

@app.post("/start")
async def start_detection():
    """Start AI detection."""
    if state.running:
        return {"ok": True, "msg": "Already running", "session_id": state.current_session_id}
    
    # Generate new session ID
    state.current_session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    state.start_time = datetime.now()
    state.reset_session()
    state.current_session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    state.running = True
    state.worker_thread = threading.Thread(target=worker_loop, daemon=True)
    state.worker_thread.start()
    
    return {
        "ok": True,
        "msg": "AI detection started",
        "session_id": state.current_session_id
    }

@app.post("/stop")
async def stop_detection():
    """Stop AI detection and save session summary."""
    if not state.running:
        return {"ok": True, "msg": "Not running"}
    
    # Signal worker to stop
    state.running = False
    
    # Note: in async def, we shouldn't block the event loop for 5 seconds with join().
    # Since worker_thread checks state.running, it will exit very quickly.
    # We will just yield to the event loop a few times to let it close.
    for _ in range(10):
        if state.worker_thread and state.worker_thread.is_alive():
            await asyncio.sleep(0.1)
        else:
            break
            
    state.worker_thread = None

    # Clear frame buffers so lingering MJPEG generators serve nothing
    with state.lock:
        state.latest_frame = None
        state.latest_frame_clean = None

    session = None
    
    # Save session summary
    if state.current_session_id and state.start_time:
        duration = (datetime.now() - state.start_time).seconds
        session = SessionData(
            session_id=state.current_session_id,
            start_time=state.start_time.isoformat(),
            exercise_type=state.current_exercise.value if state.current_exercise else "Mixed",
            total_reps=state.rep_counter.count,
            correct_reps=state.rep_counter.correct_count,
            wrong_reps=state.rep_counter.wrong_count,
            duration_seconds=duration,
            injury_alerts=state.injury_alerts
        )
        save_session_summary(session)
    
    return {
        "ok": True,
        "msg": "AI detection stopped",
        "session_summary": asdict(session) if session else None
    }

@app.post("/reset")
async def reset_counters():
    """Reset rep counters."""
    state.rep_counter.reset()
    state.validator.reset_counters()
    return {"ok": True, "msg": "Counters reset"}

async def video_generator(clean=False):
    """MJPEG stream generator."""
    print(f"Video generator started (clean={clean})")
    frame_count = 0
    last_frame_time = time.time()
    
    while True:
        if not state.running:
            await asyncio.sleep(0.1)
            continue
        
        try:
            with state.lock:
                frame = state.latest_frame_clean if clean else state.latest_frame
            
            if frame is None:
                await asyncio.sleep(0.067)  # ~15 FPS when no frame
                continue
            
            frame_count += 1
            if frame_count % 30 == 0:
                elapsed = time.time() - last_frame_time
                fps = 30 / elapsed if elapsed > 0 else 0
                print(f"Streaming: {fps:.1f} FPS, frame size: {len(frame)} bytes")
                last_frame_time = time.time()
            
            # MJPEG format with proper boundary
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n'
                b'Content-Length: ' + str(len(frame)).encode() + b'\r\n'
                b'\r\n' + bytes(frame) + b'\r\n'
            )
            await asyncio.sleep(0.067)  # ~15 FPS
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Video generator error: {e}")
            await asyncio.sleep(0.1)

@app.get("/video")
async def video_feed(clean: bool = False):
    """Video streaming endpoint. clean=false returns video with MediaPipe skeleton overlay."""
    return StreamingResponse(
        video_generator(clean=clean),
        media_type='multipart/x-mixed-replace; boundary=frame'
    )

# ==================== WEBSOCKET ENDPOINTS ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    print(f"WebSocket connection attempt from {websocket.client.host}")
    await manager.connect(websocket)
    print(f"WebSocket connection accepted for {websocket.client.host}")
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming commands if needed
            msg = json.loads(data)
            if msg.get("action") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/history")
async def get_history(limit: int = Query(50, ge=1, le=100)):
    """Get posture history from Firestore."""
    try:
        docs = db.collection("postureHistory").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit).stream()
        history = [{"id": doc.id, **doc.to_dict()} for doc in docs]
        return {"ok": True, "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve posture history")

@app.get("/sessions")
async def get_sessions(limit: int = Query(20, ge=1, le=50)):
    """Get session summaries."""
    try:
        docs = db.collection("sessions").order_by("start_time", direction=firestore.Query.DESCENDING).limit(limit).stream()
        sessions = [{"id": doc.id, **doc.to_dict()} for doc in docs]
        return {"ok": True, "sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions")

# ==================== AI API ENDPOINTS ====================

@app.post("/workout-plan")
async def generate_workout_plan(request: WorkoutPlanRequest):
    """Generate AI workout plan based on goal and experience level."""
    try:
        plan = state.workout_planner.generate_plan(request.goal, request.level)
        return {"ok": True, "plan": plan}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate workout plan")

@app.post("/set-target-reps")
async def set_target_reps(target: int = Query(..., ge=1, le=50)):
    """Set target reps for current set."""
    try:
        state.set_tracker.set_target_reps(target)
        return {"ok": True, "target_reps": target}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to set target reps")

@app.post("/skip-rest")
async def skip_rest():
    """Skip current rest period."""
    try:
        state.rest_detector.skip_rest()
        return {"ok": True, "message": "Rest skipped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to skip rest")

@app.post("/complete-workout")
async def complete_workout(user_id: str = Query(...)):
    """Complete current workout and save to Firestore."""
    try:
        state.workout_result.end_workout()
        summary = state.workout_result.get_summary()
        
        # Save to Firestore under user's data
        if user_id:
            workout_ref = db.collection("users").document(user_id).collection("workouts").add({
                "summary": summary,
                "rep_history": state.workout_result.rep_history,
                "timestamp": firestore.SERVER_TIMESTAMP
            })
            summary["firestore_id"] = workout_ref[1].id
        
        return {"ok": True, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to complete workout")

@app.get("/workout-summary")
async def get_workout_summary():
    """Get current workout summary."""
    try:
        if state.workout_result.start_time:
            state.workout_result.end_workout()
        summary = state.workout_result.get_summary()
        return {"ok": True, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get workout summary")

@app.get("/injury-risk")
def get_injury_risk():
    """Get current injury risk assessment based on recent form."""
    try:
        risk_score, level, recommendations = state.injury_predictor.calculate_risk_score()
        return {
            "ok": True,
            "risk_score": risk_score,
            "risk_level": level,
            "recommendations": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get injury risk")

@app.post("/toggle-voice-coach")
async def toggle_voice_coach(enabled: bool = Query(...)):
    """Toggle voice coach on/off."""
    try:
        state.voice_coach_enabled = enabled
        return {"ok": True, "voice_coach_enabled": enabled}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to toggle voice coach")

@app.post("/set-voice-cooldown")
async def set_voice_cooldown(cooldown: int = Query(...)):
    """Set voice coach cooldown in seconds."""
    try:
        if cooldown < 1 or cooldown > 30:
            raise HTTPException(status_code=400, detail="Cooldown must be between 1 and 30 seconds")
        state.voice_coach_cooldown = cooldown
        state.voice_coach.feedback_cooldown = cooldown
        return {"ok": True, "cooldown": cooldown}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to set voice cooldown")

@app.post("/toggle-risk-warnings")
async def toggle_risk_warnings(enabled: bool = Query(...)):
    """Toggle injury risk warnings on/off."""
    try:
        state.risk_warnings_enabled = enabled
        return {"ok": True, "risk_warnings_enabled": enabled}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to toggle risk warnings")

@app.get("/settings")
def get_settings():
    """Get current AI settings."""
    try:
        return {
            "ok": True,
            "voice_coach_enabled": state.voice_coach_enabled,
            "voice_coach_cooldown": state.voice_coach_cooldown,
            "risk_warnings_enabled": state.risk_warnings_enabled,
            "show_overlay": state.show_overlay
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get settings")
        return {"ok": False, "error": str(e)}

@app.get("/rom-analysis")
def get_range_of_motion():
    """Get range of motion analysis for tracked joints."""
    try:
        rom_data = state.pose3d_analyzer.analyze_range_of_motion(
            state.current_exercise, 
            state.pose3d_analyzer.angles_history[-50:]  # Last 50 frames
        )
        fatigue = state.pose3d_analyzer.detect_fatigue()
        return {
            "ok": True,
            "rom_data": rom_data,
            "fatigue_score": fatigue,
            "fatigue_level": "High" if fatigue > 0.7 else "Moderate" if fatigue > 0.4 else "Low"
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.get("/voice-feedback")
def get_voice_feedback():
    """Get voice feedback message if available."""
    try:
        if not state.running or not state.current_exercise:
            return {"ok": True, "voice_message": None}
        
        # This would be called from the processing loop
        # For API, we return the last voice message or None
        return {"ok": True, "voice_enabled": True, "message": "Voice coach active"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
