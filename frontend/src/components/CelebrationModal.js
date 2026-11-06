import React, { useEffect, useState, useCallback } from "react";
import { X, Sparkles, Trophy } from "lucide-react";

export default function CelebrationModal({
  isOpen,
  onClose,
  type = "achievement",
  title,
  message,
  icon,
  duration = 5000,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Auto-close after duration
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsAnimating(false);
    }
  }, [isOpen, duration, handleClose]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setIsAnimating(false);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  if (!isVisible) return null;

  const getGradient = () => {
    switch (type) {
      case "achievement":
        return "from-purple-500/20 to-indigo-500/20 border-purple-500/50";
      case "milestone":
        return "from-orange-500/20 to-red-500/20 border-orange-500/50";
      case "streak":
        return "from-green-500/20 to-emerald-500/20 border-green-500/50";
      default:
        return "from-sky-500/20 to-blue-500/20 border-sky-500/50";
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md transform transition-all duration-300 ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div
          className={`glass-card rounded-3xl p-8 bg-gradient-to-br ${getGradient()} border-2 backdrop-blur-xl shadow-2xl`}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-br ${
                type === "achievement"
                  ? "from-purple-500 to-indigo-600"
                  : type === "milestone"
                  ? "from-orange-500 to-red-600"
                  : "from-green-500 to-emerald-600"
              } flex items-center justify-center shadow-lg shadow-purple-500/25 ${
                isAnimating ? "animate-bounce" : ""
              }`}
            >
              {icon || <Trophy className="w-12 h-12 text-white" />}
            </div>
          </div>

          {/* Sparkles Animation */}
          {isAnimating && (
            <div className="absolute top-10 left-10">
              <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
            </div>
          )}
          {isAnimating && (
            <div className="absolute top-10 right-10">
              <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" style={{ animationDelay: "0.2s" }} />
            </div>
          )}

          {/* Title */}
          <h2 className="text-3xl font-bold text-white text-center mb-3">
            {title || "Achievement Unlocked!"}
          </h2>

          {/* Message */}
          <p className="text-slate-300 text-center text-lg mb-6">
            {message || "You've made great progress!"}
          </p>

          {/* Action Button */}
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-400 hover:to-purple-400 text-white font-bold transition-all shadow-lg"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
