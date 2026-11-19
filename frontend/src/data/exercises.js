// Centralized Exercise Data Configuration
// This single source of truth is used across:
// - Exercise Library
// - Exercise Details
// - AI Trainer
// - Future Workout Planner

const RAW_EXERCISES = [
  {
    id: "squat",
    name: "Squat",
    description: "Compound lower body exercise targeting quadriceps, hamstrings, and glutes",
    muscles: ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
    muscleGroup: "legs",
    equipment: ["Bodyweight", "Barbell", "Dumbbell"],
    difficulty: "beginner",
    exerciseType: "compound",
    instructions: [
      "Stand with feet shoulder-width apart",
      "Keep chest up and core engaged",
      "Lower hips back and down as if sitting in a chair",
      "Keep weight on heels",
      "Lower until thighs are parallel to floor",
      "Push through heels to return to standing"
    ],
    startingPosition: "Stand tall with feet shoulder-width apart, toes slightly pointed out",
    movementSteps: [
      "Initiate movement by pushing hips back",
      "Bend knees while keeping chest up",
      "Lower until thighs reach parallel position",
      "Pause briefly at bottom",
      "Drive through heels to stand up"
    ],
    breathing: "Inhale on the way down, exhale on the way up",
    commonMistakes: [
      "Knees caving inward (valgus)",
      "Rounding the lower back",
      "Not going low enough",
      "Weight on toes instead of heels",
      "Torso leaning too far forward"
    ],
    aiDetectableMetrics: ["Knee angle", "Hip angle", "Torso lean", "Knee valgus"],
    safetyNotes: "Keep spine neutral. If you feel knee pain, reduce depth or weight. Consider using a rack for heavier weights.",
    tutorialUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8", // ATHLEAN-X Squat Tutorial
    aiSupported: true,
    angles: ["left_knee", "right_knee", "left_hip", "right_hip", "torso_lean"],
    supportedRepCounting: true,
    supportedPostureValidation: true
  },
  {
    id: "deadlift",
    name: "Deadlift",
    description: "Full-body compound exercise for posterior chain strength",
    muscles: ["Hamstrings", "Glutes", "Lower Back", "Traps"],
    muscleGroup: "legs",
    equipment: ["Barbell", "Dumbbell", "Kettlebell"],
    difficulty: "intermediate",
    exerciseType: "compound",
    instructions: [
      "Stand with feet hip-width apart",
      "Grip bar just outside knees",
      "Keep back straight and core tight",
      "Drive through heels to stand up",
      "Keep bar close to body throughout",
      "Lower with controlled movement"
    ],
    startingPosition: "Feet hip-width apart, bar over mid-foot, grip just outside knees",
    movementSteps: [
      "Hinge at hips while keeping back straight",
      "Grip bar with mixed or double overhand grip",
      "Drive through heels, extending hips and knees",
      "Pull shoulders back at top",
      "Lower with hip hinge, keeping bar close"
    ],
    breathing: "Inhale before lifting, hold breath through lift, exhale at top",
    commonMistakes: [
      "Rounding the back",
      "Starting with hips too low",
      "Bar drifting away from body",
      "Not engaging lats",
      "Using too much lower back instead of legs"
    ],
    aiDetectableMetrics: ["Hip hinge angle", "Knee angle", "Torso lean", "Hip symmetry"],
    safetyNotes: "Maintain neutral spine. Start light to master form. Consider using straps if grip is limiting.",
    tutorialUrl: "https://www.youtube.com/watch?v=op9kVnSso6Q", // ATHLEAN-X Deadlift Tutorial
    aiSupported: true,
    angles: ["left_knee", "right_knee", "torso_lean", "left_hip", "right_hip"],
    supportedRepCounting: true,
    supportedPostureValidation: true
  },
  {
    id: "bicep-curl",
    name: "Bicep Curl",
    description: "Isolation exercise for bicep strength and hypertrophy",
    muscles: ["Biceps", "Forearms"],
    muscleGroup: "arms",
    equipment: ["Dumbbell", "Barbell", "Cable"],
    difficulty: "beginner",
    exerciseType: "isolation",
    instructions: [
      "Stand with dumbbells at sides",
      "Keep elbows pinned to sides",
      "Curl weights up by rotating palms forward",
      "Squeeze biceps at top",
      "Lower with controlled movement"
    ],
    startingPosition: "Stand tall, dumbbells at sides, palms facing forward",
    movementSteps: [
      "Keep elbows fixed at sides",
      "Curl weights by flexing elbows",
      "Rotate palms to face up at top",
      "Squeeze biceps at peak contraction",
      "Lower slowly to starting position"
    ],
    breathing: "Exhale when curling up, inhale when lowering",
    commonMistakes: [
      "Swinging elbows",
      "Using momentum",
      "Not fully extending at bottom",
      "Over-curling past shoulder level",
      "Elbows drifting outward"
    ],
    aiDetectableMetrics: ["Elbow angle", "Elbow drift", "Wrist position"],
    safetyNotes: "Keep elbows pinned to isolate biceps. Avoid using momentum. Start with lighter weight.",
    tutorialUrl: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo", // ATHLEAN-X Bicep Curl Tutorial
    aiSupported: true,
    angles: ["left_elbow", "right_elbow"],
    supportedRepCounting: true,
    supportedPostureValidation: true
  },
  {
    id: "shoulder-press",
    name: "Shoulder Press",
    description: "Compound exercise for shoulder strength and stability",
    muscles: ["Deltoids", "Triceps", "Upper Chest"],
    muscleGroup: "shoulders",
    equipment: ["Dumbbell", "Barbell", "Machine"],
    difficulty: "intermediate",
    exerciseType: "compound",
    instructions: [
      "Start with weights at shoulder height",
      "Press overhead until arms are extended",
      "Keep core tight and avoid arching back",
      "Lower with controlled movement",
      "Keep slight bend in elbows at top"
    ],
    startingPosition: "Weights at shoulder height, palms facing forward or neutral",
    movementSteps: [
      "Engage core and glutes",
      "Press weights overhead",
      "Fully extend arms without locking",
      "Lower to shoulder height",
      "Control the eccentric movement"
    ],
    breathing: "Exhale when pressing up, inhale when lowering",
    commonMistakes: [
      "Arching lower back",
      "Not pressing to full extension",
      "Flaring elbows too wide",
      "Using legs to push",
      "Uneven press between arms"
    ],
    aiDetectableMetrics: ["Elbow extension", "Overhead position", "Torso lean", "Arm symmetry"],
    safetyNotes: "Keep core engaged to protect lower back. Avoid excessive arching. Start seated if stability is an issue.",
    tutorialUrl: "https://www.youtube.com/watch?v=2yjwXTZQDDI", // ATHLEAN-X Shoulder Press Tutorial
    aiSupported: true,
    angles: ["left_elbow", "right_elbow", "torso_lean"],
    supportedRepCounting: true,
    supportedPostureValidation: true
  },
  {
    id: "pushup",
    name: "Push-up",
    description: "Classic bodyweight exercise for chest, shoulders, and triceps",
    muscles: ["Chest", "Triceps", "Shoulders", "Core"],
    muscleGroup: "chest",
    equipment: ["Bodyweight"],
    difficulty: "beginner",
    exerciseType: "compound",
    instructions: [
      "Start in plank position",
      "Keep body in straight line",
      "Lower chest toward floor",
      "Elbows at 45-degree angle",
      "Push back to starting position"
    ],
    startingPosition: "Plank position, hands slightly wider than shoulders, body straight",
    movementSteps: [
      "Lower body as one unit",
      "Keep core engaged throughout",
      "Chest should touch floor at bottom",
      "Elbows at 45 degrees from body",
      "Push up to starting position"
    ],
    breathing: "Inhale on the way down, exhale on the way up",
    commonMistakes: [
      "Sagging hips",
      "Piking hips too high",
      "Elbows flaring too wide",
      "Not going low enough",
      "Head dropping"
    ],
    aiDetectableMetrics: ["Elbow angle", "Hip position", "Body alignment"],
    safetyNotes: "Keep core engaged. Modify by doing on knees if needed. Ensure wrists are healthy.",
    tutorialUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4", // ATHLEAN-X Pushup Tutorial
    aiSupported: true,
    angles: ["left_elbow", "right_elbow", "torso_lean"],
    supportedRepCounting: true,
    supportedPostureValidation: true
  },
  {
    id: "lunge",
    name: "Lunge",
    description: "Unilateral leg exercise for balance and leg strength",
    muscles: ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
    muscleGroup: "legs",
    equipment: ["Bodyweight", "Dumbbell", "Barbell"],
    difficulty: "beginner",
    exerciseType: "compound",
    instructions: [
      "Step forward with one leg",
      "Lower hips until both knees at 90 degrees",
      "Keep front knee behind toes",
      "Push through front heel to stand",
      "Alternate legs or complete all reps on one side"
    ],
    startingPosition: "Standing tall, feet hip-width apart",
    movementSteps: [
      "Step forward with right leg",
      "Lower until front knee at 90 degrees",
      "Keep torso upright",
      "Push through front heel",
      "Return to standing and repeat with other leg"
    ],
    breathing: "Inhale when stepping, exhale when pushing up",
    commonMistakes: [
      "Front knee past toes",
      "Torso leaning forward",
      "Taking too short or too long step",
      "Not dropping low enough",
      "Back knee not reaching floor"
    ],
    aiDetectableMetrics: ["Front knee angle", "Knee over toe", "Torso position", "Hip level"],
    safetyNotes: "Keep front knee behind toes. Start with bodyweight. Use support if balance is an issue.",
    tutorialUrl: "https://www.youtube.com/watch?v=D7KaRcUTQeY", // ATHLEAN-X Lunge Tutorial
    aiSupported: true,
    angles: ["left_knee", "right_knee", "left_hip", "right_hip"],
    supportedRepCounting: true,
    supportedPostureValidation: true
  },
  {
    id: "bench-press",
    name: "Bench Press",
    description: "Compound chest exercise for upper body pushing strength",
    muscles: ["Chest", "Triceps", "Shoulders"],
    muscleGroup: "chest",
    equipment: ["Barbell", "Dumbbell", "Machine"],
    difficulty: "intermediate",
    exerciseType: "compound",
    instructions: [
      "Lie flat on bench",
      "Grip bar slightly wider than shoulders",
      "Lower bar to chest",
      "Press up until arms extended",
      "Keep shoulder blades retracted"
    ],
    startingPosition: "Lie on bench, feet flat, grip bar just outside shoulder width",
    movementSteps: [
      "Unrack bar with straight arms",
      "Lower bar to mid-chest",
      "Keep elbows at 45-75 degree angle",
      "Press bar up to starting position",
      "Control the eccentric movement"
    ],
    breathing: "Inhale when lowering, exhale when pressing",
    commonMistakes: [
      "Elbows flaring too wide",
      "Bouncing bar off chest",
      "Lifting hips off bench",
      "Unracking with bent arms",
      "Uneven press"
    ],
    aiDetectableMetrics: ["Elbow angle", "Elbow flare", "Bar symmetry", "Torso position"],
    safetyNotes: "Always use a spotter for heavy lifts. Keep feet flat. Don't arch excessively.",
    tutorialUrl: "https://www.youtube.com/watch?v=gRVjAtPip0Y", // ATHLEAN-X Bench Press Tutorial
    aiSupported: true,
    angles: ["left_elbow", "right_elbow", "torso_lean"],
    supportedRepCounting: true,
    supportedPostureValidation: true
  },
  {
    id: "tricep-curl",
    name: "Tricep Curl",
    description: "Isolation exercise for tricep strength",
    muscles: ["Triceps", "Forearms"],
    muscleGroup: "arms",
    equipment: ["Dumbbell", "Cable", "Machine"],
    difficulty: "beginner",
    exerciseType: "isolation",
    instructions: [
      "Hold dumbbell with both hands behind head",
      "Keep elbows pointing up",
      "Extend arms to lift weight",
      "Lower with controlled movement",
      "Keep upper arms stationary"
    ],
    startingPosition: "Standing or seated, dumbbell behind head, elbows pointing up",
    movementSteps: [
      "Keep elbows fixed pointing up",
      "Extend arms to lift weight",
      "Squeeze triceps at top",
      "Lower slowly to starting position",
      "Control throughout movement"
    ],
    breathing: "Exhale when extending, inhale when lowering",
    commonMistakes: [
      "Elbows moving",
      "Upper body swaying",
      "Not fully extending",
      "Using momentum",
      "Lowering too quickly"
    ],
    aiDetectableMetrics: ["Elbow angle", "Elbow drift", "Upper body stability"],
    safetyNotes: "Keep elbows pointing up. Start light. Use seated position for better stability.",
    tutorialUrl: null, // No verified tutorial URL available
    aiSupported: true,
    angles: ["left_elbow", "right_elbow"],
    supportedRepCounting: true,
    supportedPostureValidation: true
  },
  {
    id: "tricep-extension",
    name: "Tricep Extension",
    description: "Overhead tricep isolation exercise",
    muscles: ["Triceps", "Shoulders"],
    muscleGroup: "arms",
    equipment: ["Dumbbell", "Cable"],
    difficulty: "intermediate",
    exerciseType: "isolation",
    instructions: [
      "Stand with dumbbell overhead",
      "Keep upper arms vertical",
      "Lower weight behind head",
      "Extend arms to lift weight",
      "Keep shoulders down"
    ],
    startingPosition: "Standing, dumbbell overhead with both hands, arms vertical",
    movementSteps: [
      "Keep upper arms vertical",
      "Lower weight behind head",
      "Elbows at 90 degrees at bottom",
      "Extend arms overhead",
      "Squeeze triceps at top"
    ],
    breathing: "Exhale when extending, inhale when lowering",
    commonMistakes: [
      "Upper arms not vertical",
      "Shoulders elevating",
      "Using momentum",
      "Not fully extending",
      "Elbows flaring outward"
    ],
    aiDetectableMetrics: ["Elbow angle", "Upper arm position", "Shoulder elevation"],
    safetyNotes: "Keep upper arms vertical. Don't let shoulders shrug. Use lighter weight initially.",
    tutorialUrl: null, // No verified tutorial URL available
    aiSupported: true,
    angles: ["left_elbow", "right_elbow"],
    supportedRepCounting: true,
    supportedPostureValidation: true
  },
  {
    id: "lateral-raise",
    name: "Lateral Raise",
    description: "Isolation exercise for lateral deltoid development",
    muscles: ["Lateral Deltoids", "Trapezius"],
    muscleGroup: "shoulders",
    equipment: ["Dumbbell", "Cable"],
    difficulty: "beginner",
    exerciseType: "isolation",
    instructions: [
      "Stand with dumbbells at sides",
      "Raise arms to sides until horizontal",
      "Keep slight bend in elbows",
      "Keep shoulders down",
      "Lower with controlled movement"
    ],
    startingPosition: "Standing, dumbbells at sides, slight bend in elbows",
    movementSteps: [
      "Keep elbows slightly bent",
      "Raise arms to sides",
      "Stop at shoulder height (90 degrees)",
      "Don't go higher to avoid impingement",
      "Lower slowly with control"
    ],
    breathing: "Exhale when raising, inhale when lowering",
    commonMistakes: [
      "Raising too high",
      "Elbows fully bent",
      "Using momentum",
      "Shoulders shrugging",
      "Torso leaning"
    ],
    aiDetectableMetrics: ["Shoulder angle", "Elbow position", "Shoulder elevation", "Torso stability"],
    safetyNotes: "Don't raise above shoulder height. Keep shoulders down. Use light weight for form.",
    tutorialUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo", // ATHLEAN-X Lateral Raise Tutorial
    aiSupported: true,
    angles: ["left_shoulder", "right_shoulder"],
    supportedRepCounting: true,
    supportedPostureValidation: true
  },
  {
    id: "front-raise",
    name: "Front Raise",
    description: "Isolation exercise for anterior deltoid development",
    muscles: ["Anterior Deltoids", "Upper Chest"],
    muscleGroup: "shoulders",
    equipment: ["Dumbbell", "Barbell", "Cable"],
    difficulty: "beginner",
    exerciseType: "isolation",
    instructions: [
      "Stand with dumbbells at sides",
      "Raise arms in front until horizontal",
      "Keep slight bend in elbows",
      "Keep palms facing down",
      "Lower with controlled movement"
    ],
    startingPosition: "Standing, dumbbells at sides, palms facing down",
    movementSteps: [
      "Keep elbows slightly bent",
      "Raise arms directly in front",
      "Stop at shoulder height",
      "Keep torso stable",
      "Lower slowly with control"
    ],
    breathing: "Exhale when raising, inhale when lowering",
    commonMistakes: [
      "Using momentum",
      "Torso swaying",
      "Elbows fully bent",
      "Uneven arm height",
      "Raising too high"
    ],
    aiDetectableMetrics: ["Shoulder angle", "Elbow position", "Torso sway", "Arm symmetry"],
    safetyNotes: "Keep torso stable. Don't use momentum. Alternate arms if stability is an issue.",
    tutorialUrl: null, // No verified tutorial URL available
    aiSupported: true,
    angles: ["left_shoulder", "right_shoulder"],
    supportedRepCounting: true,
    supportedPostureValidation: true
  },
  {
    id: "pullup",
    name: "Pullup",
    description: "Compound upper body pulling exercise",
    muscles: ["Lats", "Biceps", "Rear Deltoids", "Rhomboids"],
    muscleGroup: "back",
    equipment: ["Pull-up Bar"],
    difficulty: "advanced",
    exerciseType: "compound",
    instructions: [
      "Hang from bar with overhand grip",
      "Pull chest toward bar",
      "Chin over bar at top",
      "Lower with controlled movement",
      "Keep core engaged"
    ],
    startingPosition: "Hanging from bar, overhand grip, arms fully extended",
    movementSteps: [
      "Engage core and lats",
      "Pull elbows down toward sides",
      "Chin clears the bar",
      "Squeeze back at top",
      "Lower with control"
    ],
    breathing: "Exhale when pulling up, inhale when lowering",
    commonMistakes: [
      "Not pulling high enough",
      "Using momentum/kipping",
      "Swinging body",
      "Not fully extending at bottom",
      "Grip too wide or narrow"
    ],
    aiDetectableMetrics: ["Elbow angle", "Body swing", "Chin clearance", "Torso position"],
    safetyNotes: "Avoid excessive swinging. Use assisted version if needed. Keep grip secure.",
    tutorialUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g", // ATHLEAN-X Pullup Tutorial
    aiSupported: true,
    angles: ["left_elbow", "right_elbow"],
    supportedRepCounting: true,
    supportedPostureValidation: true
  }
];

// Normalize exercises to guarantee both breathingGuidance and overview properties
export const EXERCISES = RAW_EXERCISES.map((ex) => ({
  ...ex,
  overview: ex.description,
  breathingGuidance: ex.breathingGuidance || ex.breathing,
  breathing: ex.breathing || ex.breathingGuidance,
}));

// Helper to extract clean YouTube embed URL
export const getYoutubeEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube-nocookie.com/embed/${match[2]}?rel=0&modestbranding=1`;
    }
  } catch {
    return null;
  }
  return null;
};

// Filter helpers
export const getExerciseById = (id) => EXERCISES.find(ex => ex.id === id);

export const getExercisesByMuscleGroup = (muscleGroup) => 
  EXERCISES.filter(ex => ex.muscleGroup === muscleGroup);

export const getExercisesByDifficulty = (difficulty) => 
  EXERCISES.filter(ex => ex.difficulty === difficulty);

export const getExercisesByEquipment = (equipment) => 
  EXERCISES.filter(ex => ex.equipment.includes(equipment));

export const getAISupportedExercises = () => 
  EXERCISES.filter(ex => ex.aiSupported);

export const searchExercises = (query) => {
  const lowerQuery = query.toLowerCase();
  return EXERCISES.filter(ex => 
    ex.name.toLowerCase().includes(lowerQuery) ||
    ex.description.toLowerCase().includes(lowerQuery) ||
    ex.muscles.some(m => m.toLowerCase().includes(lowerQuery))
  );
};

// Unique values for filters
export const MUSCLE_GROUPS = [...new Set(EXERCISES.map(ex => ex.muscleGroup))];
export const DIFFICULTIES = [...new Set(EXERCISES.map(ex => ex.difficulty))];
export const EQUIPMENT_TYPES = [...new Set(EXERCISES.flatMap(ex => ex.equipment))];
export const EXERCISE_TYPES = [...new Set(EXERCISES.map(ex => ex.exerciseType))];

