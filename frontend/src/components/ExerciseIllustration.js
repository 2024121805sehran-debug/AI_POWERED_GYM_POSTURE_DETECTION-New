import React from "react";
import { Dumbbell, Activity, Shield, Sparkles } from "lucide-react";
import squatImg from "../assets/squat.png";

// Biomechanical silhouette points for AI pose visualization
const EXERCISE_POSES = {
  squat: {
    joints: [
      { x: 50, y: 22, label: "Head" },
      { x: 50, y: 35, label: "Shoulders" },
      { x: 52, y: 56, label: "Hips" },
      { x: 38, y: 68, label: "Knee (L)" },
      { x: 62, y: 68, label: "Knee (R)" },
      { x: 36, y: 86, label: "Ankle (L)" },
      { x: 64, y: 86, label: "Ankle (R)" },
    ],
    lines: [
      [0, 1], [1, 2], [2, 3], [2, 4], [3, 5], [4, 6]
    ],
    targetZone: "Lower Body / Quads & Glutes",
    accentColor: "from-blue-600/30 via-indigo-600/20 to-purple-800/30",
    badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/30"
  },
  deadlift: {
    joints: [
      { x: 42, y: 32, label: "Head" },
      { x: 46, y: 42, label: "Shoulders" },
      { x: 58, y: 48, label: "Hips" },
      { x: 48, y: 65, label: "Bar Grip" },
      { x: 56, y: 68, label: "Knees" },
      { x: 54, y: 88, label: "Ankles" },
    ],
    lines: [
      [0, 1], [1, 2], [1, 3], [2, 4], [4, 5]
    ],
    targetZone: "Posterior Chain / Hamstrings",
    accentColor: "from-purple-600/30 via-violet-600/20 to-indigo-800/30",
    badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/30"
  },
  "bicep-curl": {
    joints: [
      { x: 50, y: 20, label: "Head" },
      { x: 50, y: 32, label: "Torso" },
      { x: 40, y: 34, label: "Shoulder (L)" },
      { x: 36, y: 52, label: "Elbow" },
      { x: 44, y: 40, label: "Forearm/Hand" },
      { x: 48, y: 84, label: "Base" },
    ],
    lines: [
      [0, 1], [1, 2], [2, 3], [3, 4], [1, 5]
    ],
    targetZone: "Arm Flexors / Biceps",
    accentColor: "from-sky-600/30 via-cyan-600/20 to-blue-800/30",
    badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/30"
  },
  "shoulder-press": {
    joints: [
      { x: 50, y: 36, label: "Head" },
      { x: 50, y: 48, label: "Torso" },
      { x: 34, y: 18, label: "Dumbbell (L)" },
      { x: 66, y: 18, label: "Dumbbell (R)" },
      { x: 38, y: 38, label: "Elbow (L)" },
      { x: 62, y: 38, label: "Elbow (R)" },
      { x: 50, y: 84, label: "Base" },
    ],
    lines: [
      [2, 4], [4, 1], [3, 5], [5, 1], [0, 1], [1, 6]
    ],
    targetZone: "Overhead Deltoids",
    accentColor: "from-cyan-600/30 via-teal-600/20 to-sky-800/30",
    badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30"
  },
  pushup: {
    joints: [
      { x: 26, y: 46, label: "Head" },
      { x: 36, y: 50, label: "Shoulders" },
      { x: 34, y: 64, label: "Hand" },
      { x: 54, y: 54, label: "Hips" },
      { x: 70, y: 60, label: "Knees" },
      { x: 84, y: 66, label: "Feet" },
    ],
    lines: [
      [0, 1], [1, 2], [1, 3], [3, 4], [4, 5]
    ],
    targetZone: "Chest & Triceps Push Core",
    accentColor: "from-emerald-600/30 via-teal-600/20 to-cyan-800/30",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
  },
  lunge: {
    joints: [
      { x: 48, y: 22, label: "Head" },
      { x: 48, y: 36, label: "Torso" },
      { x: 46, y: 52, label: "Hips" },
      { x: 34, y: 66, label: "Front Knee" },
      { x: 34, y: 84, label: "Front Ankle" },
      { x: 64, y: 72, label: "Rear Knee" },
      { x: 74, y: 84, label: "Rear Toe" },
    ],
    lines: [
      [0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6]
    ],
    targetZone: "Unilateral Legs & Glutes",
    accentColor: "from-amber-600/30 via-orange-600/20 to-purple-800/30",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30"
  },
  "bench-press": {
    joints: [
      { x: 32, y: 52, label: "Head" },
      { x: 48, y: 44, label: "Bar" },
      { x: 42, y: 54, label: "Chest/Shoulders" },
      { x: 40, y: 40, label: "Elbow" },
      { x: 62, y: 58, label: "Hips" },
      { x: 72, y: 76, label: "Feet" },
    ],
    lines: [
      [0, 2], [2, 3], [3, 1], [2, 4], [4, 5]
    ],
    targetZone: "Pectoralis Major / Chest",
    accentColor: "from-rose-600/30 via-pink-600/20 to-purple-800/30",
    badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/30"
  },
  "tricep-curl": {
    joints: [
      { x: 50, y: 24, label: "Head" },
      { x: 50, y: 40, label: "Torso" },
      { x: 48, y: 14, label: "Overhead Elbow" },
      { x: 56, y: 22, label: "Dumbbell" },
      { x: 50, y: 82, label: "Base" },
    ],
    lines: [
      [0, 1], [1, 2], [2, 3], [1, 4]
    ],
    targetZone: "Triceps Long Head",
    accentColor: "from-indigo-600/30 via-blue-600/20 to-purple-800/30",
    badgeColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30"
  },
  "tricep-extension": {
    joints: [
      { x: 50, y: 24, label: "Head" },
      { x: 50, y: 40, label: "Torso" },
      { x: 46, y: 12, label: "Elbow Lock" },
      { x: 50, y: 6, label: "Extension" },
      { x: 50, y: 82, label: "Base" },
    ],
    lines: [
      [0, 1], [1, 2], [2, 3], [1, 4]
    ],
    targetZone: "Triceps Lateral & Medial",
    accentColor: "from-violet-600/30 via-purple-600/20 to-sky-800/30",
    badgeColor: "text-violet-400 bg-violet-500/10 border-violet-500/30"
  },
  "lateral-raise": {
    joints: [
      { x: 50, y: 24, label: "Head" },
      { x: 50, y: 42, label: "Torso" },
      { x: 22, y: 38, label: "Left Dumbbell" },
      { x: 78, y: 38, label: "Right Dumbbell" },
      { x: 36, y: 38, label: "Left Elbow" },
      { x: 64, y: 38, label: "Right Elbow" },
      { x: 50, y: 82, label: "Base" },
    ],
    lines: [
      [0, 1], [1, 4], [4, 2], [1, 5], [5, 3], [1, 6]
    ],
    targetZone: "Lateral Deltoids (Cap)",
    accentColor: "from-sky-600/30 via-blue-600/20 to-indigo-800/30",
    badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/30"
  },
  "front-raise": {
    joints: [
      { x: 44, y: 24, label: "Head" },
      { x: 44, y: 42, label: "Torso" },
      { x: 72, y: 36, label: "Front Weight" },
      { x: 58, y: 38, label: "Elbow" },
      { x: 44, y: 82, label: "Base" },
    ],
    lines: [
      [0, 1], [1, 3], [3, 2], [1, 4]
    ],
    targetZone: "Anterior Deltoids",
    accentColor: "from-cyan-600/30 via-blue-600/20 to-purple-800/30",
    badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30"
  },
  pullup: {
    joints: [
      { x: 50, y: 12, label: "Bar" },
      { x: 34, y: 12, label: "Grip (L)" },
      { x: 66, y: 12, label: "Grip (R)" },
      { x: 50, y: 22, label: "Head/Chin" },
      { x: 38, y: 28, label: "Elbow (L)" },
      { x: 62, y: 28, label: "Elbow (R)" },
      { x: 50, y: 46, label: "Torso" },
      { x: 50, y: 76, label: "Legs" },
    ],
    lines: [
      [1, 0], [0, 2], [1, 4], [2, 5], [4, 6], [5, 6], [3, 6], [6, 7]
    ],
    targetZone: "Latissimus Dorsi & Back",
    accentColor: "from-blue-600/30 via-indigo-600/20 to-violet-800/30",
    badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/30"
  },
};

export default function ExerciseIllustration({ exerciseId, exerciseName, className = "h-48" }) {
  // Check if exercise has a dedicated asset image
  if (exerciseId === "squat") {
    return (
      <div className={`relative w-full ${className} overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center border border-slate-700/60 group-hover:border-sky-500/50 transition-all`}>
        <img
          src={squatImg}
          alt={exerciseName || "Squat"}
          className="w-full h-full object-cover object-center opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
        
        {/* Futuristic Pose Tag */}
        <div className="absolute bottom-2 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-sky-500/40 text-[11px] text-sky-300 font-mono backdrop-blur-md shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span>VISION POSE MODEL</span>
        </div>
      </div>
    );
  }

  const pose = EXERCISE_POSES[exerciseId] || {
    joints: [
      { x: 50, y: 24, label: "Head" },
      { x: 50, y: 44, label: "Torso" },
      { x: 38, y: 44, label: "Arm (L)" },
      { x: 62, y: 44, label: "Arm (R)" },
      { x: 44, y: 78, label: "Leg (L)" },
      { x: 56, y: 78, label: "Leg (R)" },
    ],
    lines: [[0, 1], [1, 2], [1, 3], [1, 4], [1, 5]],
    targetZone: "Compound Fitness",
    accentColor: "from-indigo-600/30 via-slate-800/40 to-purple-800/30",
    badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/30"
  };

  return (
    <div className={`relative w-full ${className} overflow-hidden rounded-xl bg-slate-950 border border-slate-700/60 group-hover:border-sky-500/50 transition-all flex items-center justify-center`}>
      {/* Background Neon Glow & Tech Grid */}
      <div className={`absolute inset-0 bg-gradient-to-br ${pose.accentColor} opacity-70 group-hover:opacity-100 transition-opacity`} />
      
      {/* Subtle Coordinate Grid Lines */}
      <div 
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: "linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />
      
      {/* SVG Pose Estimation Skeleton */}
      <svg className="w-full h-full p-4 relative z-10" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={`grad-${exerciseId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Biomechanical Bones / Connections */}
        {pose.lines.map(([i, j], idx) => {
          const p1 = pose.joints[i];
          const p2 = pose.joints[j];
          if (!p1 || !p2) return null;
          return (
            <line
              key={`line-${idx}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={`url(#grad-${exerciseId})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={idx % 2 === 0 ? "none" : "3 1"}
              className="opacity-80 group-hover:opacity-100 transition-opacity"
            />
          );
        })}

        {/* AI Tracking Landmarks / Joints */}
        {pose.joints.map((joint, idx) => (
          <g key={`joint-${idx}`}>
            <circle
              cx={joint.x}
              cy={joint.y}
              r="3.5"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="1.8"
              filter="url(#glow)"
              className="group-hover:stroke-purple-400 transition-colors"
            />
            <circle
              cx={joint.x}
              cy={joint.y}
              r="1.5"
              fill="#e0f2fe"
            />
          </g>
        ))}
      </svg>

      {/* Target Zone & AI Sensor Callout */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 text-[11px] text-slate-300 font-medium backdrop-blur-md">
          <Activity className="w-3 h-3 text-sky-400" />
          <span className="truncate max-w-[130px]">{pose.targetZone}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/90 border border-purple-500/40 text-[10px] text-purple-300 font-mono">
          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
          <span>AI POSE</span>
        </div>
      </div>
    </div>
  );
}
