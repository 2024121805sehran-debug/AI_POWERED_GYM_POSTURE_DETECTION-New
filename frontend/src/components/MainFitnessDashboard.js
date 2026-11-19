import React, { useState, useEffect, useMemo } from "react";
import {
  Play,
  Dumbbell,
  Target,
  Flame,
  Zap,
  Activity,
  ChevronRight,
  TrendingUp,
  History,
  User,
  Sparkles,
  CheckCircle2,
  Clock,
  Compass,
  ShieldAlert,
} from "lucide-react";
import {
  calculateBMI,
  getWorkoutSessions,
  calculateDashboardMetrics,
  getUserGoals,
  saveUserGoals,
} from "../data/workoutStorage";
import { EXERCISES } from "../data/exercises";
import GoalsModal from "./GoalsModal";
import WorkoutHistoryModal from "./WorkoutHistoryModal";
import ProfileSetup from "./ProfileSetup";
import { GlassCard, StatCard, SectionHeader, GlassButton } from "./ui/GlassComponents";

export default function MainFitnessDashboard({
  user,
  userProfile,
  onStartAIWorkout,
  onBrowseLibrary,
  onViewExerciseDetails,
  onProfileUpdated,
  onOpenPlanner,
}) {
  const [workouts, setWorkouts] = useState([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);
  const [goals, setGoals] = useState(null);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Load real workout data & goals
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingWorkouts(true);
      try {
        const uid = user?.uid || "guest";
        const [loadedWorkouts, loadedGoals] = await Promise.all([
          getWorkoutSessions(uid),
          getUserGoals(uid, userProfile),
        ]);
        if (isMounted) {
          setWorkouts(loadedWorkouts);
          setGoals(loadedGoals);
        }
      } catch (err) {
        console.warn("Failed to load dashboard data:", err);
      } finally {
        if (isMounted) setLoadingWorkouts(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [user, userProfile]);

  // Compute metrics from actual workout data (no fake numbers)
  const metrics = useMemo(() => {
    return calculateDashboardMetrics(workouts);
  }, [workouts]);

  // BMI Calculation
  const bmiInfo = useMemo(() => {
    const weight = parseFloat(userProfile?.weight);
    const height = parseFloat(userProfile?.height);
    return calculateBMI(weight, height);
  }, [userProfile?.weight, userProfile?.height]);

  // Time of day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const athleteName = userProfile?.name || user?.displayName || "Athlete";

  // Today's workout recommendation based on fitness goal
  const todaysWorkout = useMemo(() => {
    const goal = (userProfile?.fitnessGoal || "General Fitness").toLowerCase();
    let suggestedId = "squat";

    if (goal.includes("muscle") || goal.includes("hypertrophy")) {
      suggestedId = "bench-press";
    } else if (goal.includes("strength")) {
      suggestedId = "deadlift";
    } else if (goal.includes("endurance") || goal.includes("weight")) {
      suggestedId = "pushup";
    } else if (goal.includes("mobility")) {
      suggestedId = "lunge";
    }

    const ex = EXERCISES.find((e) => e.id === suggestedId) || EXERCISES[0];
    return {
      title: `${ex.name} Power Progression`,
      exercise: ex,
      focus: ex.muscles.slice(0, 3).join(", "),
      duration: "15-20 min",
      repsTarget: "3 Sets • 10-12 Reps",
      intensity: ex.difficulty,
    };
  }, [userProfile?.fitnessGoal]);

  const handleSaveGoals = async (newGoals) => {
    setGoals(newGoals);
    const uid = user?.uid || "guest";
    await saveUserGoals(uid, newGoals);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Hero Section */}
      <GlassCard className="relative overflow-hidden bg-gradient-to-br from-white via-indigo-50/50 to-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-violet-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-600">
                <Sparkles className="w-3.5 h-3.5" />
                AI Vision Coach
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-xs font-medium text-violet-600">
                {userProfile?.fitnessLevel || "Beginner"} • {userProfile?.fitnessGoal || "General Fitness"}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              {greeting}, <span className="text-indigo-600">{athleteName}</span>
            </h1>

            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              Ready for your workout? Track joint alignment, count valid repetitions, and achieve perfect form with real-time AI feedback.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlassButton
              onClick={() => onStartAIWorkout && onStartAIWorkout(todaysWorkout.exercise)}
              variant="primary"
              className="flex items-center justify-center gap-2 px-6 py-3 font-semibold"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start AI Workout</span>
            </GlassButton>

            <GlassButton
              onClick={() => setShowGoalsModal(true)}
              variant="secondary"
              className="flex items-center justify-center gap-2 px-5 py-3 font-medium"
            >
              <Target className="w-4 h-4 text-indigo-600" />
              <span>Set Goals</span>
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Current Streak"
          value={`${metrics.currentStreak} days`}
          subtext={metrics.currentStreak > 0 ? "Consecutive active days" : "Complete a session to start"}
          color="amber"
        />

        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="This Week"
          value={`${metrics.weeklyWorkouts} / ${goals?.weeklyWorkoutsTarget || 4}`}
          subtext="Workouts completed"
          color="indigo"
          progress={Math.min(100, Math.round((metrics.weeklyWorkouts / (goals?.weeklyWorkoutsTarget || 4)) * 100))}
        />

        <StatCard
          icon={<Dumbbell className="w-5 h-5" />}
          label="Total Reps"
          value={metrics.hasWorkouts ? metrics.totalReps.toLocaleString() : "0"}
          subtext={metrics.hasWorkouts ? "Verified AI counts" : "No workouts yet"}
          color="violet"
        />

        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Avg Form Score"
          value={metrics.hasWorkouts ? `${metrics.averageFormScore}%` : "—"}
          subtext={metrics.hasWorkouts ? "Biomechanical accuracy" : "No workouts yet"}
          color="emerald"
        />
      </div>

      {/* Today's Workout */}
      <GlassCard className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-semibold text-gray-900">Today's Workout</h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-medium">
            Tailored to Goal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <span className="px-2.5 py-0.5 rounded-md bg-violet-100 text-violet-700 text-xs font-semibold uppercase">
              {todaysWorkout.intensity} Level
            </span>
            <h3 className="text-xl font-bold text-gray-900">{todaysWorkout.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Focus on full range of motion. AI will track joint alignment and count valid repetitions in real-time.
            </p>

            <div className="space-y-1.5 pt-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600 shrink-0" />
                <span><strong>Target:</strong> {todaysWorkout.focus}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-600 shrink-0" />
                <span><strong>Session:</strong> {todaysWorkout.duration} ({todaysWorkout.repsTarget})</span>
              </div>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-white shadow-md flex items-center justify-center">
                <Dumbbell className="w-10 h-10 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">{todaysWorkout.exercise.name}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 mt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => onViewExerciseDetails && onViewExerciseDetails(todaysWorkout.exercise)}
            className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
          >
            <span>View Movement Guide</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <GlassButton
            onClick={() => onStartAIWorkout && onStartAIWorkout(todaysWorkout.exercise)}
            variant="primary"
            className="flex items-center gap-2 px-5 py-2.5 font-semibold text-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Workout</span>
          </GlassButton>
        </div>
      </GlassCard>

      {/* Latest Workout */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>Latest Workout</span>
          </h2>
          {metrics.hasWorkouts && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All
            </button>
          )}
        </div>

        {metrics.latestWorkout ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900 font-semibold text-sm">
                  {metrics.latestWorkout.exercise || "Workout Session"}
                </h3>
                <span className="text-[10px] font-mono text-gray-500">
                  {new Date(
                    metrics.latestWorkout.timestamp || metrics.latestWorkout.createdAt
                  ).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-white border border-gray-200">
                  <span className="text-gray-500 block text-[10px] font-medium uppercase">Reps</span>
                  <span className="text-gray-900 font-semibold text-sm">
                    {metrics.latestWorkout.totalReps || metrics.latestWorkout.reps || 0}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-white border border-gray-200">
                  <span className="text-gray-500 block text-[10px] font-medium uppercase">Accuracy</span>
                  <span className="text-emerald-600 font-semibold text-sm">
                    {metrics.latestWorkout.formScore || metrics.latestWorkout.accuracy || 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Recent Activity:</p>
              {metrics.recentWorkouts.slice(0, 3).map((w, idx) => (
                <div
                  key={w.id || idx}
                  className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <span className="text-gray-700 font-medium">{w.exercise || "Session"}</span>
                  <span className="text-gray-500 font-mono">
                    {w.totalReps || w.reps || 0} reps • {w.formScore || w.accuracy || 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No workouts yet</h3>
            <p className="text-gray-500 text-xs max-w-xs mx-auto">
              Complete your first AI-guided session to see your workout history.
            </p>
          </div>
        )}

        <GlassButton
          onClick={() => onStartAIWorkout && onStartAIWorkout()}
          variant="secondary"
          className="w-full mt-4 py-2.5 font-medium text-xs"
        >
          Start New Workout
        </GlassButton>
      </GlassCard>

      {/* Goals & BMI Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals Progress Card */}
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-600">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Fitness Goals</h2>
                <p className="text-xs text-gray-500">Performance targets & progress</p>
              </div>
            </div>
            <button
              onClick={() => setShowGoalsModal(true)}
              className="text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              Edit Goals
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-gray-700 font-medium">Weekly Workouts</span>
                <span className="text-indigo-600 font-mono font-semibold">
                  {metrics.weeklyWorkouts} / {goals?.weeklyWorkoutsTarget || 4}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((metrics.weeklyWorkouts / (goals?.weeklyWorkoutsTarget || 4)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-gray-700 font-medium">Weekly Reps</span>
                <span className="text-violet-600 font-mono font-semibold">
                  {metrics.totalReps} / {goals?.weeklyRepsTarget || 150}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-500 to-purple-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((metrics.totalReps / (goals?.weeklyRepsTarget || 150)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-gray-700 font-medium">Form Accuracy</span>
                <span className="text-emerald-600 font-mono font-semibold">
                  {metrics.hasWorkouts ? `${metrics.averageFormScore}%` : "0%"} / {goals?.targetFormScore || 85}%
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((metrics.averageFormScore / (goals?.targetFormScore || 85)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-600">Key Exercise Focus:</span>
              <span className="font-semibold text-gray-900 px-2.5 py-1 rounded-lg bg-white border border-gray-200">
                {goals?.targetExercise || "Squat"}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* BMI Card */}
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">BMI Screening</h2>
                <p className="text-xs text-gray-500">Body Mass Index calculator</p>
              </div>
            </div>
            <button
              onClick={() => setShowProfileModal(true)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Update
            </button>
          </div>

          {bmiInfo ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-600 font-medium block">BMI Index</span>
                  <span className="text-3xl font-bold text-gray-900 tracking-tight">{bmiInfo.bmi}</span>
                </div>
                <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${bmiInfo.color}`}>
                  {bmiInfo.category}
                </div>
              </div>

              <div className="text-xs text-gray-600 leading-relaxed p-3.5 rounded-lg bg-gray-50 border border-gray-100">
                <p>{bmiInfo.description}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-[11px] text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Screening Notice:</strong> {bmiInfo.disclaimer}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <Activity className="w-10 h-10 text-gray-400 mx-auto" />
              <p className="text-gray-500 text-xs max-w-xs mx-auto">
                Height and weight measurements are needed to calculate your BMI.
              </p>
              <GlassButton
                onClick={() => setShowProfileModal(true)}
                variant="primary"
                className="px-4 py-2 font-medium text-xs"
              >
                Set Height & Weight
              </GlassButton>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Quick Exercise Access */}
      <div className="space-y-4">
        <SectionHeader
          title="Quick Exercise Access"
          subtitle="View exercise details and practice with AI"
          action={
            <button
              onClick={onBrowseLibrary}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <span>View All Exercises</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {EXERCISES.slice(0, 4).map((ex) => (
            <GlassCard
              key={ex.id}
              onClick={() => onViewExerciseDetails && onViewExerciseDetails(ex)}
              className="cursor-pointer hover:shadow-lg transition-all duration-300"
            >
              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-4 mb-3 flex items-center justify-center">
                <Dumbbell className="w-8 h-8 text-indigo-600" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-900">{ex.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-600">
                  AI Ready
                </span>
              </div>
              <p className="text-gray-500 text-xs line-clamp-1 mb-3">{ex.muscles.join(", ")}</p>

              <GlassButton
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartAIWorkout && onStartAIWorkout(ex);
                }}
                className="w-full py-2 px-3 font-medium text-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Practice with AI</span>
              </GlassButton>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showGoalsModal && (
        <GoalsModal
          currentGoals={goals}
          onSaveGoals={handleSaveGoals}
          onClose={() => setShowGoalsModal(false)}
        />
      )}

      {showHistoryModal && (
        <WorkoutHistoryModal
          workouts={workouts}
          onClose={() => setShowHistoryModal(false)}
          onSelectExercise={onStartAIWorkout}
        />
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <ProfileSetup
              userProfile={userProfile}
              isModal={true}
              onClose={() => setShowProfileModal(false)}
              onProfileComplete={(updated) => {
                if (onProfileUpdated) onProfileUpdated(updated);
                setShowProfileModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
