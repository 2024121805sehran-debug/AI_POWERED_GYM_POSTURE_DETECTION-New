import React, { useState } from "react";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  History,
  Target,
  Sparkles,
} from "lucide-react";

export default function UserMenu({
  userProfile,
  onProfileClick,
  onGoalsClick,
  onHistoryClick,
  onSettingsClick,
  onLogout,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn("Logout error:", error);
    }
    setIsOpen(false);
    if (onLogout) onLogout();
  };

  const getInitials = (name) => {
    if (!name) return "A";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative">
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-800/70 border border-slate-700/80 hover:border-slate-600 transition-all shadow-sm"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-sky-500/20">
          {getInitials(userProfile?.name)}
        </div>

        {/* User Info */}
        <div className="text-left hidden md:block">
          <p className="text-white font-semibold text-xs truncate max-w-[120px]">
            {userProfile?.name || "Athlete"}
          </p>
          <p className="text-slate-400 text-[10px] truncate max-w-[120px]">
            {userProfile?.fitnessGoal || "General Fitness"}
          </p>
        </div>

        {/* Chevron */}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in duration-150">
            {/* Profile Section */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40">
              <p className="text-white font-bold text-sm truncate">
                {userProfile?.name || "Athlete"}
              </p>
              <p className="text-slate-400 text-xs truncate">
                {userProfile?.email || "Local Verified Athlete"}
              </p>
              {userProfile?.fitnessLevel && (
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[10px] font-medium text-purple-300">
                  {userProfile.fitnessLevel} • {userProfile?.fitnessGoal || "General"}
                </span>
              )}
            </div>

            {/* Menu Items */}
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  if (onProfileClick) onProfileClick();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs font-medium"
              >
                <User className="w-4 h-4 text-sky-400" />
                <span>Fitness Profile &amp; BMI</span>
              </button>

              <button
                onClick={() => {
                  if (onGoalsClick) onGoalsClick();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs font-medium"
              >
                <Target className="w-4 h-4 text-purple-400" />
                <span>Fitness Goals</span>
              </button>

              <button
                onClick={() => {
                  if (onHistoryClick) onHistoryClick();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs font-medium"
              >
                <History className="w-4 h-4 text-indigo-400" />
                <span>Workout History</span>
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800" />

            {/* Logout */}
            <div className="p-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors text-xs font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
