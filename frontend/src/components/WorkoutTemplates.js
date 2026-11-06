import React from "react";
import { Clock, Dumbbell, Play, ArrowRight } from "lucide-react";
import { WORKOUT_TEMPLATES } from "../data/workoutPlanner";

export default function WorkoutTemplates({ onSelectTemplate }) {
  const categories = [
    { id: "all", name: "All Templates" },
    { id: "beginner", name: "Beginner" },
    { id: "intermediate", name: "Intermediate" },
    { id: "advanced", name: "Advanced" },
    { id: "quick", name: "Quick Workouts" },
  ];

  const [selectedCategory, setSelectedCategory] = React.useState("all");

  const filteredTemplates = selectedCategory === "all"
    ? WORKOUT_TEMPLATES
    : selectedCategory === "quick"
    ? WORKOUT_TEMPLATES.filter((t) => t.category === "quick")
    : WORKOUT_TEMPLATES.filter((t) => t.fitnessLevel === selectedCategory);

  const getCategoryColor = (category) => {
    switch (category) {
      case "beginner":
        return "from-green-500/20 to-emerald-500/20 border-green-500/30";
      case "intermediate":
        return "from-sky-500/20 to-blue-500/20 border-sky-500/30";
      case "advanced":
        return "from-purple-500/20 to-indigo-500/20 border-purple-500/30";
      case "quick":
        return "from-orange-500/20 to-red-500/20 border-orange-500/30";
      default:
        return "from-slate-500/20 to-slate-500/20 border-slate-500/30";
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Dumbbell className="text-sky-400" />
        Workout Templates
      </h2>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedCategory === category.id
                ? "bg-sky-500 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`p-4 rounded-xl bg-gradient-to-br ${getCategoryColor(template.fitnessLevel)} border backdrop-blur-sm hover:scale-105 transition-all cursor-pointer`}
            onClick={() => onSelectTemplate(template)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-bold text-lg">{template.name}</h3>
                <p className="text-slate-400 text-sm">{template.description}</p>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-bold capitalize bg-white/10 text-white">
                {template.fitnessLevel}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-300 mb-3">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{template.duration} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Dumbbell className="w-4 h-4" />
                <span>{template.exercises.length} exercises</span>
              </div>
            </div>

            <div className="space-y-1">
              {template.exercises.slice(0, 3).map((ex, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-slate-400">
                  <span>{ex.exercise}</span>
                  <span>{ex.sets} × {ex.reps}</span>
                </div>
              ))}
              {template.exercises.length > 3 && (
                <p className="text-xs text-slate-500">+{template.exercises.length - 3} more</p>
              )}
            </div>

            <button className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all">
              <Play className="w-4 h-4" />
              Start Workout
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
        <p className="text-orange-300 text-xs">
          ⚠️ These templates are for educational purposes only. Consult a fitness professional before starting any new exercise program.
        </p>
      </div>
    </div>
  );
}
