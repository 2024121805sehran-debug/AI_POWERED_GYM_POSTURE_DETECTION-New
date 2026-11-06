import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config.js";

// Local storage key prefix
const STORAGE_PREFIX = "ai_gym_coach_";

/**
 * Calculate BMI and category
 * BMI = weight (kg) / [height (m)]^2
 */
export function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
    return null;
  }

  const heightInMeters = heightCm / 100;
  const bmiRaw = weightKg / (heightInMeters * heightInMeters);
  const bmi = parseFloat(bmiRaw.toFixed(1));

  let category = "";
  let color = "";
  let description = "";

  if (bmi < 18.5) {
    category = "Underweight";
    color = "text-amber-400 bg-amber-500/15 border-amber-500/30";
    description = "Below standard range. Focus on nutrient-rich caloric surplus and resistance hypertrophy training.";
  } else if (bmi >= 18.5 && bmi <= 24.9) {
    category = "Normal weight";
    color = "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
    description = "Within the healthy standard range. Maintain balanced nutrition, strength consistency, and cardiovascular mobility.";
  } else if (bmi >= 25.0 && bmi <= 29.9) {
    category = "Overweight";
    color = "text-sky-400 bg-sky-500/15 border-sky-500/30";
    description = "Slightly above standard range. Note that high muscular athletic development often registers in this range.";
  } else {
    category = "Obesity range";
    color = "text-rose-400 bg-rose-500/15 border-rose-500/30";
    description = "Elevated screening index. Regular low-impact resistance training and metabolic conditioning are recommended.";
  }

  return {
    bmi,
    category,
    color,
    description,
    disclaimer: "BMI is a general population screening measure and is not a medical diagnosis. It does not distinguish between lean skeletal muscle mass and adipose tissue.",
  };
}

/**
 * Save a completed workout to Firestore and local cache
 */
export async function saveWorkoutSession(userId, sessionData) {
  const normalizedData = {
    ...sessionData,
    userId: userId || "guest",
    timestamp: sessionData.timestamp || new Date().toISOString(),
    createdAt: Date.now(),
  };

  // 1. Always update local cache for instant UI feedback and guest mode support
  try {
    const key = `${STORAGE_PREFIX}workouts_${userId || "guest"}`;
    const local = JSON.parse(localStorage.getItem(key) || "[]");
    local.unshift(normalizedData);
    localStorage.setItem(key, JSON.stringify(local.slice(0, 50)));
  } catch (err) {
    console.warn("Failed to write workout to local cache:", err);
  }

  // 2. If authenticated real user, persist to Firestore
  if (userId && !userId.startsWith("guest") && userId !== "guest-athlete") {
    try {
      const userWorkoutsRef = collection(db, "users", userId, "workouts");
      await addDoc(userWorkoutsRef, {
        ...normalizedData,
        serverTimestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Could not save workout to Firestore (offline or rules):", err.message);
    }
  }

  return normalizedData;
}

/**
 * Fetch workouts from Firestore with localStorage fallback
 */
export async function getWorkoutSessions(userId) {
  const uid = userId || "guest";
  let workouts = [];

  // Try Firestore for authenticated users
  if (uid && !uid.startsWith("guest") && uid !== "guest-athlete") {
    try {
      const q = query(
        collection(db, "users", uid, "workouts"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        workouts = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
      }
    } catch (err) {
      console.warn("Firestore workouts fetch notice:", err.message);
    }
  }

  // Fallback or merge with localStorage
  try {
    const key = `${STORAGE_PREFIX}workouts_${uid}`;
    const local = JSON.parse(localStorage.getItem(key) || "[]");
    if (workouts.length === 0 && local.length > 0) {
      workouts = local;
    }
  } catch (e) {
    // Ignore JSON errors
  }

  return workouts;
}

/**
 * Calculate accurate dashboard metrics from real stored workout data
 * Returns "No workouts yet" states if empty
 */
export function calculateDashboardMetrics(workouts = []) {
  if (!workouts || workouts.length === 0) {
    return {
      hasWorkouts: false,
      totalWorkouts: 0,
      totalReps: 0,
      averageFormScore: 0,
      weeklyWorkouts: 0,
      currentStreak: 0,
      latestWorkout: null,
      recentWorkouts: [],
    };
  }

  let totalReps = 0;
  let formScoreSum = 0;
  let scoreCount = 0;

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  let weeklyWorkouts = 0;

  // Track distinct workout dates for streak calculation
  const distinctDays = new Set();

  workouts.forEach((w) => {
    const reps = Number(w.totalReps || w.reps || 0);
    totalReps += reps;

    const score = Number(w.formScore || w.form_score || w.accuracy || 0);
    if (score > 0) {
      formScoreSum += score;
      scoreCount++;
    }

    const wDate = new Date(w.timestamp || w.createdAt || Date.now());
    if (!isNaN(wDate.getTime())) {
      if (wDate >= oneWeekAgo) {
        weeklyWorkouts++;
      }
      distinctDays.add(wDate.toISOString().split("T")[0]);
    }
  });

  const averageFormScore = scoreCount > 0 ? Math.round(formScoreSum / scoreCount) : 0;

  // Calculate day streak
  let currentStreak = 0;
  const todayStr = now.toISOString().split("T")[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // If worked out today or yesterday, count backwards
  let checkDate = distinctDays.has(todayStr) ? now : distinctDays.has(yesterdayStr) ? yesterday : null;

  if (checkDate) {
    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (distinctDays.has(dateStr)) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
  }

  const latestWorkout = workouts[0] || null;

  return {
    hasWorkouts: true,
    totalWorkouts: workouts.length,
    totalReps,
    averageFormScore,
    weeklyWorkouts,
    currentStreak,
    latestWorkout,
    recentWorkouts: workouts.slice(0, 5),
  };
}

/**
 * Default Goals Model
 */
export const DEFAULT_GOALS = {
  weeklyWorkoutsTarget: 4,
  weeklyRepsTarget: 150,
  targetExercise: "Squat",
  targetFormScore: 85,
  workoutFrequency: "4 days / week",
};

/**
 * Save user goals
 */
export async function saveUserGoals(userId, goals) {
  const uid = userId || "guest";
  try {
    const key = `${STORAGE_PREFIX}goals_${uid}`;
    localStorage.setItem(key, JSON.stringify(goals));
  } catch (err) {
    console.warn("Failed to save goals locally:", err);
  }

  if (uid && !uid.startsWith("guest") && uid !== "guest-athlete") {
    try {
      const goalsRef = doc(db, "users", uid);
      await setDoc(goalsRef, { fitnessGoals: goals }, { merge: true });
    } catch (err) {
      console.warn("Could not save goals to Firestore:", err.message);
    }
  }
}

/**
 * Get user goals
 */
export async function getUserGoals(userId, userProfile) {
  const uid = userId || "guest";
  if (userProfile?.fitnessGoals) {
    return { ...DEFAULT_GOALS, ...userProfile.fitnessGoals };
  }

  try {
    const key = `${STORAGE_PREFIX}goals_${uid}`;
    const local = localStorage.getItem(key);
    if (local) {
      return { ...DEFAULT_GOALS, ...JSON.parse(local) };
    }
  } catch (e) {
    // Ignore
  }

  if (uid && !uid.startsWith("guest") && uid !== "guest-athlete") {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists() && userDoc.data().fitnessGoals) {
        return { ...DEFAULT_GOALS, ...userDoc.data().fitnessGoals };
      }
    } catch (err) {
      // Ignore
    }
  }

  return DEFAULT_GOALS;
}
