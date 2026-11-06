import React from "react";
import { Lock, CheckCircle } from "lucide-react";

export default function AchievementBadge({ achievement, size = "md" }) {
  const sizeClasses = {
    sm: "w-16 h-16 text-2xl",
    md: "w-20 h-20 text-3xl",
    lg: "w-24 h-24 text-4xl",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const categoryColors = {
    milestone: "from-purple-500/20 to-indigo-500/20 border-purple-500/30",
    reps: "from-orange-500/20 to-red-500/20 border-orange-500/30",
    streak: "from-green-500/20 to-emerald-500/20 border-green-500/30",
    form: "from-sky-500/20 to-blue-500/20 border-sky-500/30",
    variety: "from-pink-500/20 to-rose-500/20 border-pink-500/30",
  };

  const bgColor = achievement.unlocked
    ? categoryColors[achievement.category] || categoryColors.milestone
    : "from-slate-800/50 to-slate-700/50 border-slate-600/50";

  const opacity = achievement.unlocked ? "opacity-100" : "opacity-50";

  return (
    <div
      className={`relative flex flex-col items-center p-4 rounded-2xl bg-gradient-to-br ${bgColor} border backdrop-blur-sm transition-all ${opacity} hover:scale-105`}
    >
      {/* Badge Icon */}
      <div
        className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-gradient-to-br ${
          achievement.unlocked
            ? "from-slate-900 to-slate-800"
            : "from-slate-800 to-slate-900"
        } border-2 shadow-lg`}
      >
        {achievement.unlocked ? (
          <span className="relative">
            {achievement.icon}
            <CheckCircle className="absolute -top-1 -right-1 w-5 h-5 text-green-400 bg-slate-900 rounded-full" />
          </span>
        ) : (
          <Lock className="w-6 h-6 text-slate-500" />
        )}
      </div>

      {/* Badge Name */}
      <h3
        className={`mt-3 font-bold text-white text-center ${textSizeClasses[size]}`}
      >
        {achievement.name}
      </h3>

      {/* Badge Description */}
      <p className={`text-slate-400 text-center ${textSizeClasses[size]} mt-1`}>
        {achievement.description}
      </p>

      {/* Progress Bar (if not unlocked) */}
      {!achievement.unlocked && achievement.progress < 100 && (
        <div className="w-full mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-purple-500 transition-all"
            style={{ width: `${achievement.progress}%` }}
          />
        </div>
      )}

      {/* Category Badge */}
      <span
        className={`mt-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
          achievement.unlocked
            ? "bg-white/10 text-white"
            : "bg-slate-700 text-slate-400"
        }`}
      >
        {achievement.category}
      </span>
    </div>
  );
}
