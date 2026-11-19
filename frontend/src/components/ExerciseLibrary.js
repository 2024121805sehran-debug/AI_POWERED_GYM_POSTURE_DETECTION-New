import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Dumbbell,
  Target,
  ChevronDown,
  X,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  EXERCISES,
  MUSCLE_GROUPS,
  DIFFICULTIES,
  EQUIPMENT_TYPES,
  EXERCISE_TYPES,
} from "../data/exercises";
import { GlassCard, GlassButton, SectionHeader } from "./ui/GlassComponents";

export default function ExerciseLibrary({ onSelectExercise, onShowDetails }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    muscleGroup: "all",
    difficulty: "all",
    equipment: "all",
    exerciseType: "all",
    aiOnly: false,
  });

  // Filter exercises
  const filteredExercises = useMemo(() => {
    return EXERCISES.filter((exercise) => {
      // Search query filter (matches name, description, muscles, equipment)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = exercise.name.toLowerCase().includes(query);
        const matchesDesc = exercise.description.toLowerCase().includes(query);
        const matchesMuscles = exercise.muscles.some((m) =>
          m.toLowerCase().includes(query)
        );
        const matchesEquipment = exercise.equipment.some((eq) =>
          eq.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesDesc && !matchesMuscles && !matchesEquipment) {
          return false;
        }
      }

      // Muscle group filter
      if (filters.muscleGroup !== "all" && exercise.muscleGroup !== filters.muscleGroup) {
        return false;
      }

      // Difficulty filter
      if (filters.difficulty !== "all" && exercise.difficulty !== filters.difficulty) {
        return false;
      }

      // Equipment filter
      if (filters.equipment !== "all" && !exercise.equipment.includes(filters.equipment)) {
        return false;
      }

      // Exercise type filter
      if (filters.exerciseType !== "all" && exercise.exerciseType !== filters.exerciseType) {
        return false;
      }

      // AI only filter
      if (filters.aiOnly && !exercise.aiSupported) {
        return false;
      }

      return true;
    });
  }, [searchQuery, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.muscleGroup !== "all") count++;
    if (filters.difficulty !== "all") count++;
    if (filters.equipment !== "all") count++;
    if (filters.exerciseType !== "all") count++;
    if (filters.aiOnly) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      muscleGroup: "all",
      difficulty: "all",
      equipment: "all",
      exerciseType: "all",
      aiOnly: false,
    });
    setSearchQuery("");
  };

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "beginner":
        return {
          bg: "bg-emerald-100 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
        };
      case "intermediate":
        return {
          bg: "bg-amber-100 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
        };
      case "advanced":
        return {
          bg: "bg-rose-100 text-rose-700 border-rose-200",
          dot: "bg-rose-500",
        };
      default:
        return {
          bg: "bg-gray-100 text-gray-600 border-gray-200",
          dot: "bg-gray-400",
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Hero Header */}
      <GlassCard className="relative overflow-hidden bg-gradient-to-br from-white via-indigo-50/50 to-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-violet-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Exercise Library
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-violet-100 border border-violet-200 text-xs font-medium text-violet-600">
                {EXERCISES.length} Exercises
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              Explore Exercises
            </h1>
            <p className="text-gray-600 text-sm md:text-base mt-2 max-w-2xl">
              Learn proper form and build better movement. Select any exercise to view detailed instructions or practice with AI feedback.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Exercises</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredExercises.length}
                <span className="text-sm font-normal text-gray-500 ml-1">/ {EXERCISES.length}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="relative z-10 mt-6 pt-6 border-t border-gray-100 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, muscle, or equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <GlassButton
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters || activeFilterCount > 0 ? "primary" : "secondary"}
            className="flex items-center justify-center gap-2 px-5 py-3.5 font-medium text-sm"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`} />
          </GlassButton>
        </div>

        {/* Expandable Filter Tray */}
        {showFilters && (
          <div className="relative z-10 mt-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  Muscle Group
                </label>
                <select
                  value={filters.muscleGroup}
                  onChange={(e) => setFilters({ ...filters, muscleGroup: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="all">All Muscle Groups</option>
                  {MUSCLE_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group.charAt(0).toUpperCase() + group.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-violet-600" />
                  Difficulty
                </label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="all">All Levels</option>
                  {DIFFICULTIES.map((diff) => (
                    <option key={diff} value={diff}>
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-indigo-600" />
                  Equipment
                </label>
                <select
                  value={filters.equipment}
                  onChange={(e) => setFilters({ ...filters, equipment: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="all">Any Equipment</option>
                  {EQUIPMENT_TYPES.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-violet-600" />
                  Type
                </label>
                <select
                  value={filters.exerciseType}
                  onChange={(e) => setFilters({ ...filters, exerciseType: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="all">All Types</option>
                  {EXERCISE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-600 hover:text-gray-900">
                <input
                  type="checkbox"
                  checked={filters.aiOnly}
                  onChange={(e) => setFilters({ ...filters, aiOnly: e.target.checked })}
                  className="w-4 h-4 rounded bg-white border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-medium">AI-Supported Only</span>
              </label>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors py-1 px-2 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Exercise Cards Grid */}
      {filteredExercises.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => {
            const diffStyle = getDifficultyBadge(exercise.difficulty);

            return (
              <GlassCard
                key={exercise.id}
                onClick={() => onShowDetails && onShowDetails(exercise)}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300"
              >
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-6 mb-4 flex items-center justify-center">
                  <Dumbbell className="w-12 h-12 text-indigo-600" />
                </div>

                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {exercise.name}
                  </h3>
                  {exercise.aiSupported && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-semibold shrink-0">
                      AI Ready
                    </span>
                  )}
                </div>

                <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">
                  {exercise.description}
                </p>

                <div className="mb-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-medium text-gray-600">Target Muscles:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.muscles.slice(0, 3).map((muscle) => (
                      <span
                        key={muscle}
                        className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium"
                      >
                        {muscle}
                      </span>
                    ))}
                    {exercise.muscles.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-xs font-mono">
                        +{exercise.muscles.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-wider ${diffStyle.bg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${diffStyle.dot}`} />
                    <span>{exercise.difficulty}</span>
                  </div>

                  <div className="flex items-center gap-1 text-gray-500">
                    <Dumbbell className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate max-w-[120px] font-medium text-gray-600">
                      {exercise.equipment[0] || "Bodyweight"}
                    </span>
                  </div>
                </div>

                <GlassButton
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowDetails && onShowDetails(exercise);
                  }}
                  className="w-full mt-4 py-2.5 font-medium text-sm flex items-center justify-center gap-1.5"
                >
                  <span>View Exercise</span>
                  <ChevronRight className="w-4 h-4" />
                </GlassButton>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <GlassCard className="p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Matching Exercises</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            We couldn't find any exercises matching your search or filter combination.
          </p>
          <GlassButton
            onClick={clearFilters}
            variant="primary"
            className="px-5 py-2.5 font-medium text-sm inline-flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            <span>Reset Filters</span>
          </GlassButton>
        </GlassCard>
      )}
    </div>
  );
}
