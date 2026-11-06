import React, { useState } from "react";
import {
  Target,
  Trophy,
  Dumbbell,
  Calendar,
  Zap,
  X,
  Save,
} from "lucide-react";
import { EXERCISES } from "../data/exercises";

export default function GoalsModal({ currentGoals, onSaveGoals, onClose }) {
  const [goals, setGoals] = useState({
    weeklyWorkoutsTarget: currentGoals?.weeklyWorkoutsTarget || 4,
    weeklyRepsTarget: currentGoals?.weeklyRepsTarget || 150,
    targetExercise: currentGoals?.targetExercise || "Squat",
    targetFormScore: currentGoals?.targetFormScore || 85,
    workoutFrequency: currentGoals?.workoutFrequency || "4 days / week",
  });

  const handleChange = (field, value) => {
    setGoals((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveGoals(goals);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Fitness Goals &amp; Targets</h2>
              <p className="text-xs text-slate-400">Set personalized performance milestones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Weekly Workouts Target */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                Weekly Workouts Goal
              </label>
              <span className="text-sm font-bold text-sky-400 font-mono">
                {goals.weeklyWorkoutsTarget} sessions / week
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="7"
              value={goals.weeklyWorkoutsTarget}
              onChange={(e) => handleChange("weeklyWorkoutsTarget", parseInt(e.target.value, 10))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>1 session</span>
              <span>4 sessions</span>
              <span>7 sessions</span>
            </div>
          </div>

          {/* Weekly Reps Target */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-purple-400" />
                Target Weekly Reps
              </label>
              <span className="text-sm font-bold text-purple-400 font-mono">
                {goals.weeklyRepsTarget} reps
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="500"
              step="10"
              value={goals.weeklyRepsTarget}
              onChange={(e) => handleChange("weeklyRepsTarget", parseInt(e.target.value, 10))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>30 reps</span>
              <span>250 reps</span>
              <span>500 reps</span>
            </div>
          </div>

          {/* Target Form Score */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Target Form Accuracy Score
              </label>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {goals.targetFormScore}%
              </span>
            </div>
            <input
              type="range"
              min="60"
              max="98"
              value={goals.targetFormScore}
              onChange={(e) => handleChange("targetFormScore", parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>60% (Developing)</span>
              <span>85% (Optimal)</span>
              <span>98% (Mastery)</span>
            </div>
          </div>

          {/* Target Key Exercise */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              Focus Exercise Milestone
            </label>
            <select
              value={goals.targetExercise}
              onChange={(e) => handleChange("targetExercise", e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              {EXERCISES.map((ex) => (
                <option key={ex.id} value={ex.name}>
                  {ex.name} ({ex.muscleGroup})
                </option>
              ))}
            </select>
          </div>

          {/* Workout Frequency */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
              Preferred Workout Cadence
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["3 days / week", "4 days / week", "5+ days / week"].map((cadence) => (
                <button
                  key={cadence}
                  type="button"
                  onClick={() => handleChange("workoutFrequency", cadence)}
                  className={`p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    goals.workoutFrequency === cadence
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {cadence}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-success flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Update Goals</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
