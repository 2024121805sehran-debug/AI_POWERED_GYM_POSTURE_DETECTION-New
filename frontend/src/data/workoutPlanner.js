// Personalized Workout Coach
// Uses real user data for workout planning, recommendations, and summaries

// ==================== WORKOUT TEMPLATES ====================

export const WORKOUT_TEMPLATES = [
  {
    id: "full_body_beginner",
    name: "Full Body - Beginner",
    description: "Complete full-body workout for beginners",
    duration: 20,
    exercises: [
      { exercise: "Squat", sets: 2, reps: 10 },
      { exercise: "Pushup", sets: 2, reps: 8 },
      { exercise: "Bicep Curl", sets: 2, reps: 10 },
      { exercise: "Lunge", sets: 2, reps: 8 },
    ],
    fitnessLevel: "beginner",
    category: "full_body",
  },
  {
    id: "full_body_intermediate",
    name: "Full Body - Intermediate",
    description: "Complete full-body workout for intermediate athletes",
    duration: 30,
    exercises: [
      { exercise: "Squat", sets: 3, reps: 12 },
      { exercise: "Deadlift", sets: 3, reps: 8 },
      { exercise: "Pushup", sets: 3, reps: 12 },
      { exercise: "Bicep Curl", sets: 3, reps: 12 },
      { exercise: "Shoulder Press", sets: 3, reps: 10 },
    ],
    fitnessLevel: "intermediate",
    category: "full_body",
  },
  {
    id: "upper_body",
    name: "Upper Body Focus",
    description: "Target chest, shoulders, arms, and back",
    duration: 25,
    exercises: [
      { exercise: "Pushup", sets: 3, reps: 12 },
      { exercise: "Shoulder Press", sets: 3, reps: 10 },
      { exercise: "Bicep Curl", sets: 3, reps: 12 },
      { exercise: "Pullup", sets: 3, reps: 8 },
    ],
    fitnessLevel: "intermediate",
    category: "upper_body",
  },
  {
    id: "lower_body",
    name: "Lower Body Focus",
    description: "Target legs and glutes",
    duration: 25,
    exercises: [
      { exercise: "Squat", sets: 4, reps: 12 },
      { exercise: "Deadlift", sets: 3, reps: 10 },
      { exercise: "Lunge", sets: 3, reps: 10 },
    ],
    fitnessLevel: "intermediate",
    category: "lower_body",
  },
  {
    id: "strength",
    name: "Strength Builder",
    description: "Lower reps, higher sets for strength",
    duration: 35,
    exercises: [
      { exercise: "Squat", sets: 5, reps: 5 },
      { exercise: "Deadlift", sets: 5, reps: 5 },
      { exercise: "Bench Press", sets: 5, reps: 5 },
      { exercise: "Shoulder Press", sets: 4, reps: 6 },
    ],
    fitnessLevel: "advanced",
    category: "strength",
  },
  {
    id: "quick_workout",
    name: "Quick Workout",
    description: "Fast 10-minute workout",
    duration: 10,
    exercises: [
      { exercise: "Squat", sets: 2, reps: 15 },
      { exercise: "Pushup", sets: 2, reps: 12 },
    ],
    fitnessLevel: "beginner",
    category: "quick",
  },
];

// ==================== EXERCISE CATEGORIES ====================

export const EXERCISE_CATEGORIES = {
  compound: ["Squat", "Deadlift", "Bench Press", "Pullup"],
  isolation: ["Bicep Curl", "Tricep Curl", "Tricep Extension", "Lateral Raise", "Front Raise"],
  bodyweight: ["Pushup", "Pullup", "Lunge"],
  lower_body: ["Squat", "Deadlift", "Lunge"],
  upper_body: ["Bench Press", "Shoulder Press", "Bicep Curl", "Tricep Curl", "Pullup"],
};

// ==================== PERSONALIZATION LOGIC ====================

/**
 * Analyze user's workout history for personalization
 * @param {Array} workouts - User's workout history
 * @returns {Object} Analysis results
 */
export const analyzeWorkoutHistory = (workouts) => {
  if (!workouts || workouts.length === 0) {
    return {
      totalWorkouts: 0,
      totalReps: 0,
      averageFormScore: 0,
      bestExercise: null,
      worstExercise: null,
      commonMistakes: [],
      exerciseFrequency: {},
      daysSinceLastWorkout: null,
      fitnessLevel: "beginner",
    };
  }

  const totalWorkouts = workouts.length;
  const totalReps = workouts.reduce((sum, w) => sum + (w.totalReps || 0), 0);
  
  const formScores = workouts
    .map((w) => w.formScore)
    .filter((score) => score !== undefined && score !== null);
  const averageFormScore = formScores.length > 0
    ? formScores.reduce((sum, score) => sum + score, 0) / formScores.length
    : 0;

  // Exercise frequency
  const exerciseFrequency = {};
  workouts.forEach((workout) => {
    const exercise = workout.exercise;
    if (exercise && exercise !== "Workout Session") {
      exerciseFrequency[exercise] = (exerciseFrequency[exercise] || 0) + 1;
    }
  });

  // Find best and worst exercises by form score
  const exerciseFormScores = {};
  workouts.forEach((workout) => {
    const exercise = workout.exercise;
    if (exercise && workout.formScore) {
      if (!exerciseFormScores[exercise]) {
        exerciseFormScores[exercise] = [];
      }
      exerciseFormScores[exercise].push(workout.formScore);
    }
  });

  let bestExercise = null;
  let worstExercise = null;
  let bestAvgScore = 0;
  let worstAvgScore = 100;

  Object.entries(exerciseFormScores).forEach(([exercise, scores]) => {
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    if (avg > bestAvgScore) {
      bestAvgScore = avg;
      bestExercise = exercise;
    }
    if (avg < worstAvgScore) {
      worstAvgScore = avg;
      worstExercise = exercise;
    }
  });

  // Common mistakes
  const mistakeCount = {};
  workouts.forEach((workout) => {
    if (workout.issue && workout.issue !== "Start AI detection to begin") {
      mistakeCount[workout.issue] = (mistakeCount[workout.issue] || 0) + 1;
    }
  });
  const commonMistakes = Object.entries(mistakeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mistake]) => mistake);

  // Days since last workout
  const lastWorkout = workouts[workouts.length - 1];
  const daysSinceLastWorkout = lastWorkout?.timestamp
    ? Math.floor((Date.now() - new Date(lastWorkout.timestamp)) / (1000 * 60 * 60 * 24))
    : null;

  // Determine fitness level
  let fitnessLevel = "beginner";
  if (totalWorkouts >= 20 && averageFormScore >= 80) {
    fitnessLevel = "advanced";
  } else if (totalWorkouts >= 10 && averageFormScore >= 70) {
    fitnessLevel = "intermediate";
  }

  return {
    totalWorkouts,
    totalReps,
    averageFormScore,
    bestExercise,
    worstExercise,
    commonMistakes,
    exerciseFrequency,
    daysSinceLastWorkout,
    fitnessLevel,
  };
};

/**
 * Generate adaptive workout recommendations
 * @param {Object} userProfile - User's profile with fitness goal and level
 * @param {Array} workouts - User's workout history
 * @returns {Object} Recommendations
 */
export const generateRecommendations = (userProfile, workouts) => {
  const analysis = analyzeWorkoutHistory(workouts);
  const fitnessGoal = userProfile?.fitnessGoal || "general_fitness";
  const userFitnessLevel = userProfile?.fitnessLevel || "beginner";

  const recommendations = [];

  // Base recommendation on fitness goal
  if (fitnessGoal === "strength") {
    recommendations.push({
      exercise: "Squat",
      sets: 4,
      reps: 6,
      reason: "Recommended for strength building based on your goal",
    });
    recommendations.push({
      exercise: "Deadlift",
      sets: 4,
      reps: 6,
      reason: "Compound movement for strength development",
    });
  } else if (fitnessGoal === "weight_loss") {
    recommendations.push({
      exercise: "Squat",
      sets: 3,
      reps: 15,
      reason: "Higher reps for calorie burn and endurance",
    });
    recommendations.push({
      exercise: "Pushup",
      sets: 3,
      reps: 15,
      reason: "Bodyweight exercise for full-body engagement",
    });
  } else if (fitnessGoal === "muscle_gain") {
    recommendations.push({
      exercise: "Bench Press",
      sets: 4,
      reps: 10,
      reason: "Hypertrophy-focused rep range for muscle growth",
    });
    recommendations.push({
      exercise: "Bicep Curl",
      sets: 3,
      reps: 12,
      reason: "Isolation exercise for targeted muscle development",
    });
  } else {
    // General fitness
    recommendations.push({
      exercise: "Squat",
      sets: 3,
      reps: 10,
      reason: "Foundation exercise for general fitness",
    });
    recommendations.push({
      exercise: "Pushup",
      sets: 3,
      reps: 10,
      reason: "Upper body pushing movement",
    });
  }

  // Adapt based on form performance
  if (analysis.worstExercise && analysis.averageFormScore < 75) {
    recommendations.push({
      exercise: analysis.worstExercise,
      sets: 2,
      reps: 8,
      reason: "Focus on form practice for this exercise (lower form score detected)",
    });
  }

  // Add variety based on frequency
  const frequentlyDone = Object.keys(analysis.exerciseFrequency).filter(
    (ex) => analysis.exerciseFrequency[ex] >= 3
  );
  if (frequentlyDone.length > 0) {
    const rarelyDone = Object.keys(EXERCISE_CATEGORIES.compound).filter(
      (ex) => !frequentlyDone.includes(ex)
    );
    if (rarelyDone.length > 0) {
      recommendations.push({
        exercise: rarelyDone[0],
        sets: 2,
        reps: 10,
        reason: "Add variety to your routine (new exercise)",
      });
    }
  }

  // Adjust for days since last workout
  if (analysis.daysSinceLastWorkout > 7) {
    recommendations.forEach((rec) => {
      rec.sets = Math.max(1, rec.sets - 1);
      rec.reason += " (reduced intensity after break)";
    });
  }

  // Adjust for fitness level
  if (userFitnessLevel === "beginner") {
    recommendations.forEach((rec) => {
      rec.sets = Math.min(2, rec.sets);
      rec.reps = Math.min(10, rec.reps);
    });
  }

  return {
    recommendations,
    analysis,
    fitnessGoal,
    userFitnessLevel,
  };
};

/**
 * Generate AI workout summary
 * @param {Object} workout - Current workout data
 * @param {Array} history - Full workout history
 * @returns {Object} AI summary
 */
export const generateWorkoutSummary = (workout, history) => {
  const analysis = analyzeWorkoutHistory(history);
  
  const whatWentWell = [];
  const whatNeedsImprovement = [];
  const suggestedNextWorkout = [];

  // What went well
  if (workout.formScore >= 80) {
    whatWentWell.push(`Excellent form score of ${workout.formScore.toFixed(0)}%`);
  }
  if (workout.correctReps / Math.max(1, workout.totalReps) >= 0.8) {
    whatWentWell.push(`High rep accuracy: ${((workout.correctReps / Math.max(1, workout.totalReps)) * 100).toFixed(0)}% correct`);
  }
  if (workout.duration > 0 && workout.duration < 30) {
    whatWentWell.push("Efficient workout duration");
  }
  if (whatWentWell.length === 0) {
    whatWentWell.push("Workout completed successfully");
  }

  // What needs improvement
  if (workout.formScore < 70) {
    whatNeedsImprovement.push(`Form score of ${workout.formScore.toFixed(0)}% - focus on technique`);
  }
  if (workout.wrongReps > workout.correctReps) {
    whatNeedsImprovement.push("More incorrect reps than correct - slow down and focus on form");
  }
  if (workout.injuryAlerts > 0) {
    whatNeedsImprovement.push(`${workout.injuryAlerts} injury risk alerts - review your form`);
  }
  if (workout.issue && workout.issue !== "Start AI detection to begin") {
    whatNeedsImprovement.push(`Common issue: ${workout.issue}`);
  }
  if (whatNeedsImprovement.length === 0) {
    whatNeedsImprovement.push("Great form overall - keep it up!");
  }

  // Suggested next workout
  if (analysis.daysSinceLastWorkout > 5) {
    suggestedNextWorkout.push("Consider a beginner-friendly template to ease back in");
  }
  if (workout.formScore < 70) {
    suggestedNextWorkout.push("Focus on form practice with lower reps");
  }
  if (analysis.worstExercise) {
    suggestedNextWorkout.push(`Practice ${analysis.worstExercise} to improve technique`);
  }
  if (workout.formScore >= 85) {
    suggestedNextWorkout.push("Ready to increase intensity or try advanced template");
  }
  if (suggestedNextWorkout.length === 0) {
    suggestedNextWorkout.push("Continue with your current routine or try a new template");
  }

  return {
    whatWentWell,
    whatNeedsImprovement,
    commonMistake: workout.issue || "None detected",
    suggestedNextWorkout,
    overallPerformance: workout.formScore >= 75 ? "Excellent" : workout.formScore >= 60 ? "Good" : "Needs Improvement",
  };
};

/**
 * Create custom workout
 * @param {string} name - Workout name
 * @param {Array} exercises - Array of {exercise, sets, reps}
 * @param {number} duration - Estimated duration in minutes
 * @returns {Object} Workout object
 */
export const createCustomWorkout = (name, exercises, duration) => {
  return {
    id: `custom_${Date.now()}`,
    name,
    exercises,
    duration,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Get template by ID
 * @param {string} templateId - Template ID
 * @returns {Object|null} Template or null
 */
export const getTemplateById = (templateId) => {
  return WORKOUT_TEMPLATES.find((t) => t.id === templateId) || null;
};

/**
 * Get templates by fitness level
 * @param {string} fitnessLevel - beginner, intermediate, advanced
 * @returns {Array} Matching templates
 */
export const getTemplatesByLevel = (fitnessLevel) => {
  return WORKOUT_TEMPLATES.filter((t) => t.fitnessLevel === fitnessLevel);
};

/**
 * Get templates by category
 * @param {string} category - full_body, upper_body, lower_body, strength, quick
 * @returns {Array} Matching templates
 */
export const getTemplatesByCategory = (category) => {
  return WORKOUT_TEMPLATES.filter((t) => t.category === category);
};
