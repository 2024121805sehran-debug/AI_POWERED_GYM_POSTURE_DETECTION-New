import React from "react";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { generateRecommendations } from "../data/workoutPlanner";

export default function AdaptiveRecommendations({ userProfile, workouts, onSelectRecommendation }) {
  const { recommendations, analysis, fitnessGoal, userFitnessLevel } = generateRecommendations(
    userProfile,
    workouts
  );

  if (recommendations.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Lightbulb className="text-sky-400" />
          AI Recommendations
        </h2>
        <p className="text-slate-400">
          Complete more workouts to get personalized recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Lightbulb className="text-sky-400" />
        AI Recommendations
      </h2>

      {/* Fitness Context */}
      <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Goal: <span className="text-white font-medium capitalize">{fitnessGoal.replace('_', ' ')}</span></span>
          <span className="text-slate-400">Level: <span className="text-white font-medium capitalize">{userFitnessLevel}</span></span>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className="p-4 rounded-xl bg-gradient-to-r from-sky-500/10 to-purple-500/10 border border-sky-500/30 hover:border-sky-500/50 transition-all cursor-pointer"
            onClick={() => onSelectRecommendation(rec)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold">{rec.exercise}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400">
                    {rec.sets} × {rec.reps}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{rec.reason}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-sky-400 mt-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Analysis Insights */}
      {analysis.totalWorkouts > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-white font-semibold text-sm">Your Progress</h3>
          
          {analysis.bestExercise && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>Best exercise: {analysis.bestExercise}</span>
            </div>
          )}
          
          {analysis.worstExercise && analysis.averageFormScore < 75 && (
            <div className="flex items-center gap-2 text-sm text-orange-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Focus area: {analysis.worstExercise}</span>
            </div>
          )}
          
          {analysis.daysSinceLastWorkout > 7 && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <TrendingUp className="w-4 h-4" />
              <span>Last workout: {analysis.daysSinceLastWorkout} days ago</span>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
        <p className="text-orange-300 text-xs">
          ⚠️ These recommendations are for educational purposes only. They are not medical or personalized fitness advice. Always consult a fitness professional.
        </p>
      </div>
    </div>
  );
}
