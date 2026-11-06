import React from "react";
import { CheckCircle, AlertTriangle, TrendingUp, X, Sparkles } from "lucide-react";
import { generateWorkoutSummary } from "../data/workoutPlanner";

export default function WorkoutSummaryModal({ workout, history, onClose }) {
  const summary = generateWorkoutSummary(workout, history);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg transform transition-all">
        <div className="glass-card rounded-3xl p-8 bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-sky-500/30 backdrop-blur-xl shadow-2xl">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Workout Summary</h2>
              <p className="text-slate-400 text-sm">AI-generated insights</p>
            </div>
          </div>

          {/* Overall Performance */}
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-sky-500/20 to-purple-500/20 border border-sky-500/30">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Overall Performance</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                summary.overallPerformance === "Excellent"
                  ? "bg-green-500/20 text-green-400"
                  : summary.overallPerformance === "Good"
                  ? "bg-sky-500/20 text-sky-400"
                  : "bg-orange-500/20 text-orange-400"
              }`}>
                {summary.overallPerformance}
              </span>
            </div>
          </div>

          {/* What Went Well */}
          <div className="mb-4">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              What Went Well
            </h3>
            <ul className="space-y-2">
              {summary.whatWentWell.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-slate-300 text-sm">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What Needs Improvement */}
          <div className="mb-4">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              What Needs Improvement
            </h3>
            <ul className="space-y-2">
              {summary.whatNeedsImprovement.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-slate-300 text-sm">
                  <span className="text-orange-400 mt-0.5">!</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Common Mistake */}
          <div className="mb-4">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Common Mistake
            </h3>
            <p className="text-slate-300 text-sm">{summary.commonMistake}</p>
          </div>

          {/* Suggested Next Workout */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-400" />
              Suggested Next Workout
            </h3>
            <ul className="space-y-2">
              {summary.suggestedNextWorkout.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-slate-300 text-sm">
                  <span className="text-sky-400 mt-0.5">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <p className="text-orange-300 text-xs">
              ⚠️ This summary is for educational purposes only. It is not medical advice or personalized fitness guidance. Always consult a fitness professional.
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-400 hover:to-purple-400 text-white font-bold transition-all shadow-lg"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
