import React from "react";
import {
  History,
  X,
  Calendar,
  Dumbbell,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

export default function WorkoutHistoryModal({ workouts = [], onClose, onSelectExercise }) {
  const formatTime = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return "Recent Session";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Recent Session";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Workout Session History</h2>
              <p className="text-xs text-slate-400">
                {workouts.length} total completed workout{workouts.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {workouts.length > 0 ? (
            workouts.map((w, idx) => {
              const reps = w.totalReps || w.reps || 0;
              const formScore = w.formScore || w.form_score || w.accuracy || 0;
              const duration = w.duration || 0;
              const exerciseName = w.exercise || "Workout Session";

              return (
                <div
                  key={w.id || idx}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-base">{exerciseName}</span>
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {formatDate(w.timestamp || w.createdAt)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3.5 h-3.5 text-purple-400" />
                        <strong className="text-slate-200">{reps}</strong> reps
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        <span>{formatTime(duration)}</span>
                      </span>
                      {w.injuryAlerts > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{w.injuryAlerts} safety cues</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase font-mono">Form Score</p>
                      <span
                        className={`text-sm font-extrabold font-mono px-2 py-0.5 rounded-lg border ${
                          formScore >= 80
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : formScore >= 60
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {formScore > 0 ? `${formScore}%` : "Tracked"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-slate-950 flex items-center justify-center mx-auto mb-3 text-slate-600 border border-slate-800">
                <History className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No workouts yet</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Completed AI posture detection workouts will be logged here with rep counts, biomechanical accuracy, and safety analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
