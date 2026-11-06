// Gamification System for AI Gym Coach
// Uses real user workout data for streaks, achievements, badges, and milestones

// ==================== ACHIEVEMENT DEFINITIONS ====================

export const ACHIEVEMENTS = [
  {
    id: "first_workout",
    name: "First Steps",
    description: "Complete your first workout",
    icon: "🎯",
    category: "milestone",
    condition: (stats) => stats.totalWorkouts >= 1,
    progress: (stats) => Math.min(100, stats.totalWorkouts * 100),
    target: 1,
  },
  {
    id: "ten_workouts",
    name: "Getting Started",
    description: "Complete 10 workouts",
    icon: "🏃",
    category: "milestone",
    condition: (stats) => stats.totalWorkouts >= 10,
    progress: (stats) => Math.min(100, (stats.totalWorkouts / 10) * 100),
    target: 10,
  },
  {
    id: "hundred_reps",
    name: "Century Club",
    description: "Complete 100 total reps",
    icon: "💪",
    category: "reps",
    condition: (stats) => stats.totalReps >= 100,
    progress: (stats) => Math.min(100, (stats.totalReps / 100) * 100),
    target: 100,
  },
  {
    id: "five_hundred_reps",
    name: "Half K",
    description: "Complete 500 total reps",
    icon: "🔥",
    category: "reps",
    condition: (stats) => stats.totalReps >= 500,
    progress: (stats) => Math.min(100, (stats.totalReps / 500) * 100),
    target: 500,
  },
  {
    id: "thousand_reps",
    name: "K Club",
    description: "Complete 1,000 total reps",
    icon: "⚡",
    category: "reps",
    condition: (stats) => stats.totalReps >= 1000,
    progress: (stats) => Math.min(100, (stats.totalReps / 1000) * 100),
    target: 1000,
  },
  {
    id: "seven_day_streak",
    name: "Week Warrior",
    description: "Maintain a 7-day workout streak",
    icon: "🗓️",
    category: "streak",
    condition: (stats) => stats.currentStreak >= 7,
    progress: (stats) => Math.min(100, (stats.currentStreak / 7) * 100),
    target: 7,
  },
  {
    id: "thirty_day_streak",
    name: "Month Master",
    description: "Maintain a 30-day workout streak",
    icon: "🏆",
    category: "streak",
    condition: (stats) => stats.currentStreak >= 30,
    progress: (stats) => Math.min(100, (stats.currentStreak / 30) * 100),
    target: 30,
  },
  {
    id: "perfect_form",
    name: "Perfectionist",
    description: "Complete a rep with 100% form score",
    icon: "✨",
    category: "form",
    condition: (stats) => stats.bestFormScore >= 100,
    progress: (stats) => Math.min(100, stats.bestFormScore),
    target: 100,
  },
  {
    id: "high_form",
    name: "Form Master",
    description: "Maintain an average form score of 90+",
    icon: "🎯",
    category: "form",
    condition: (stats) => stats.averageFormScore >= 90,
    progress: (stats) => Math.min(100, stats.averageFormScore),
    target: 90,
  },
  {
    id: "exercise_explorer",
    name: "Explorer",
    description: "Try 5 different exercises",
    icon: "🧭",
    category: "variety",
    condition: (stats) => stats.uniqueExercises >= 5,
    progress: (stats) => Math.min(100, (stats.uniqueExercises / 5) * 100),
    target: 5,
  },
];

// ==================== STREAK CALCULATION ====================

/**
 * Calculate workout streaks from workout history
 * @param {Array} workouts - Array of workout objects with timestamp
 * @returns {Object} Streak information
 */
export const calculateStreaks = (workouts) => {
  if (!workouts || workouts.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      weeklyConsistency: 0,
      workoutDays: [],
    };
  }

  // Extract unique workout days (ignore multiple workouts on same day)
  const workoutDays = new Set();
  workouts.forEach((workout) => {
    const date = new Date(workout.timestamp || workout.date);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    workoutDays.add(dayKey);
  });

  const sortedDays = Array.from(workoutDays).sort().reverse();
  
  // Calculate current streak
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < sortedDays.length; i++) {
    const workoutDate = new Date(sortedDays[i]);
    workoutDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today - workoutDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === i) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;
  
  for (let i = 1; i < sortedDays.length; i++) {
    const prevDate = new Date(sortedDays[i - 1]);
    const currDate = new Date(sortedDays[i]);
    const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate weekly consistency (workouts in last 7 days)
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  let weeklyConsistency = 0;
  sortedDays.forEach((day) => {
    const workoutDate = new Date(day);
    if (workoutDate >= sevenDaysAgo) {
      weeklyConsistency++;
    }
  });

  return {
    currentStreak,
    longestStreak,
    weeklyConsistency,
    workoutDays: sortedDays,
  };
};

// ==================== ACHIEVEMENT CHECKING ====================

/**
 * Check which achievements are unlocked based on user stats
 * @param {Object} stats - User workout statistics
 * @returns {Array} Array of achievements with unlock status
 */
export const checkAchievements = (stats) => {
  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: achievement.condition(stats),
    progress: achievement.progress(stats),
  }));
};

/**
 * Get newly unlocked achievements
 * @param {Object} currentStats - Current user stats
 * @param {Object} previousStats - Previous user stats
 * @param {Array} previouslyUnlocked - Previously unlocked achievement IDs
 * @returns {Array} Newly unlocked achievements
 */
export const getNewAchievements = (currentStats, previousStats, previouslyUnlocked) => {
  const currentAchievements = checkAchievements(currentStats);
  const newUnlocks = currentAchievements.filter(
    (a) => a.unlocked && !previouslyUnlocked.includes(a.id)
  );
  return newUnlocks;
};

// ==================== USER STATS CALCULATION ====================

/**
 * Calculate comprehensive user statistics from workout history
 * @param {Array} workouts - Array of workout objects
 * @returns {Object} User statistics
 */
export const calculateUserStats = (workouts) => {
  if (!workouts || workouts.length === 0) {
    return {
      totalWorkouts: 0,
      totalReps: 0,
      correctReps: 0,
      wrongReps: 0,
      averageFormScore: 0,
      bestFormScore: 0,
      uniqueExercises: 0,
      totalDuration: 0,
    };
  }

  const totalWorkouts = workouts.length;
  const totalReps = workouts.reduce((sum, w) => sum + (w.totalReps || 0), 0);
  const correctReps = workouts.reduce((sum, w) => sum + (w.correctReps || 0), 0);
  const wrongReps = workouts.reduce((sum, w) => sum + (w.wrongReps || 0), 0);
  
  const formScores = workouts
    .map((w) => w.formScore)
    .filter((score) => score !== undefined && score !== null);
  
  const averageFormScore = formScores.length > 0
    ? formScores.reduce((sum, score) => sum + score, 0) / formScores.length
    : 0;
  
  const bestFormScore = formScores.length > 0 ? Math.max(...formScores) : 0;
  
  const uniqueExercises = new Set(
    workouts
      .map((w) => w.exercise)
      .filter((e) => e && e !== "Workout Session")
  ).size;
  
  const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);

  // Calculate streaks
  const streakInfo = calculateStreaks(workouts);

  return {
    totalWorkouts,
    totalReps,
    correctReps,
    wrongReps,
    averageFormScore,
    bestFormScore,
    uniqueExercises,
    totalDuration,
    ...streakInfo,
  };
};

// ==================== FIRESTORE INTEGRATION ====================

/**
 * Save unlocked achievements to Firestore
 * @param {string} userId - User ID
 * @param {Array} achievementIds - Array of unlocked achievement IDs
 * @param {Object} db - Firestore database instance
 */
export const saveAchievements = async (userId, achievementIds, db) => {
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    
    const achievementsRef = doc(db, 'users', userId, 'achievements', 'unlocked');
    await setDoc(achievementsRef, {
      achievementIds,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Failed to save achievements:', error);
    return false;
  }
};

/**
 * Load unlocked achievements from Firestore
 * @param {string} userId - User ID
 * @param {Object} db - Firestore database instance
 * @returns {Promise<Array>} Array of unlocked achievement IDs
 */
export const loadAchievements = async (userId, db) => {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    
    const achievementsRef = doc(db, 'users', userId, 'achievements', 'unlocked');
    const docSnap = await getDoc(achievementsRef);
    
    if (docSnap.exists()) {
      return docSnap.data().achievementIds || [];
    }
    
    return [];
  } catch (error) {
    console.error('Failed to load achievements:', error);
    return [];
  }
};

// ==================== MILESTONES ====================

export const MILESTONES = [
  { reps: 100, name: "100 Reps", icon: "💪" },
  { reps: 500, name: "500 Reps", icon: "🔥" },
  { reps: 1000, name: "1K Reps", icon: "⚡" },
  { reps: 5000, name: "5K Reps", icon: "🌟" },
  { reps: 10000, name: "10K Reps", icon: "🏆" },
];

/**
 * Get next milestone
 * @param {number} currentReps - Current total reps
 * @returns {Object|null} Next milestone or null if all completed
 */
export const getNextMilestone = (currentReps) => {
  return MILESTONES.find((m) => m.reps > currentReps) || null;
};

/**
 * Get milestone progress
 * @param {number} currentReps - Current total reps
 * @returns {Object} Milestone progress information
 */
export const getMilestoneProgress = (currentReps) => {
  const nextMilestone = getNextMilestone(currentReps);
  
  if (!nextMilestone) {
    return {
      completed: true,
      progress: 100,
      nextMilestone: null,
    };
  }
  
  const previousMilestoneIndex = MILESTONES.findIndex((m) => m.reps > currentReps) - 1;
  const previousMilestone = previousMilestoneIndex >= 0 ? MILESTONES[previousMilestoneIndex] : { reps: 0 };
  
  const progress = ((currentReps - previousMilestone.reps) / (nextMilestone.reps - previousMilestone.reps)) * 100;
  
  return {
    completed: false,
    progress: Math.min(100, Math.max(0, progress)),
    nextMilestone,
  };
};
