import React from "react";
import { Home, Dumbbell, Video, Trophy, User } from "lucide-react";

export default function BottomNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "exercises", label: "Exercises", icon: Dumbbell },
    { id: "trainer", label: "AI Trainer", icon: Video, emphasized: true },
    { id: "progress", label: "Progress", icon: Trophy },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      {/* Floating Navigation */}
      <div className="mx-4 mb-4 bg-glass-white backdrop-blur-glass border border-slate-200/50 shadow-float rounded-2xl px-2 py-2">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? "text-brand-600 bg-brand-50"
                  : "text-text-muted hover:text-text-primary hover:bg-slate-50"
              } ${tab.emphasized ? "-mt-6" : ""}`}
            >
              {tab.emphasized ? (
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-brand-600 text-white shadow-brand-500/50 scale-110"
                    : "bg-brand-500 text-white shadow-brand-500/30 hover:scale-105"
                }`}>
                  <tab.icon className="w-7 h-7" />
                </div>
              ) : (
                <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? "scale-110" : ""}`} />
              )}
              <span className={`text-xs font-medium ${tab.emphasized ? "mt-1" : ""}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
