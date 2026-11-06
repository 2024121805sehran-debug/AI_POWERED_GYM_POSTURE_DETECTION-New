import React, { useState } from "react";
import { Plus, Trash2, Clock, Save, X } from "lucide-react";
import { EXERCISES } from "../data/exercises";
import { createCustomWorkout } from "../data/workoutPlanner";

export default function WorkoutPlanner({ onSave, onCancel }) {
  const [workoutName, setWorkoutName] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState(20);
  const [exercises, setExercises] = useState([{ exercise: "", sets: 3, reps: 10 }]);

  const addExercise = () => {
    setExercises([...exercises, { exercise: "", sets: 3, reps: 10 }]);
  };

  const removeExercise = (index) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter((_, i) => i !== index));
    }
  };

  const updateExercise = (index, field, value) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };

  const handleSave = () => {
    if (!workoutName.trim()) {
      alert("Please enter a workout name");
      return;
    }

    const validExercises = exercises.filter((ex) => ex.exercise);
    if (validExercises.length === 0) {
      alert("Please add at least one exercise");
      return;
    }

    const workout = createCustomWorkout(workoutName, validExercises, estimatedDuration);
    onSave(workout);
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Plus className="text-sky-400" />
          Create Custom Workout
        </h2>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Workout Name */}
      <div className="mb-4">
        <label className="block text-white font-medium mb-2">Workout Name</label>
        <input
          type="text"
          value={workoutName}
          onChange={(e) => setWorkoutName(e.target.value)}
          placeholder="e.g., My Monday Workout"
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-sky-500 focus:outline-none"
        />
      </div>

      {/* Duration */}
      <div className="mb-6">
        <label className="block text-white font-medium mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" />
          Estimated Duration (minutes)
        </label>
        <input
          type="number"
          min="5"
          max="120"
          value={estimatedDuration}
          onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 20)}
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-sky-500 focus:outline-none"
        />
      </div>

      {/* Exercises */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-white font-medium">Exercises</label>
          <button
            onClick={addExercise}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Exercise
          </button>
        </div>

        <div className="space-y-3">
          {exercises.map((ex, index) => (
            <div key={index} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <label className="block text-slate-400 text-xs mb-1">Exercise</label>
                  <select
                    value={ex.exercise}
                    onChange={(e) => updateExercise(index, "exercise", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:border-sky-500 focus:outline-none"
                  >
                    <option value="">Select exercise</option>
                    {EXERCISES.map((exercise) => (
                      <option key={exercise.id} value={exercise.name}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-20">
                  <label className="block text-slate-400 text-xs mb-1">Sets</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={ex.sets}
                    onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value) || 3)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="w-20">
                  <label className="block text-slate-400 text-xs mb-1">Reps</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={ex.reps}
                    onChange={(e) => updateExercise(index, "reps", parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                {exercises.length > 1 && (
                  <button
                    onClick={() => removeExercise(index)}
                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all mt-5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mb-6 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
        <p className="text-orange-300 text-xs">
          ⚠️ This workout planner is for educational purposes only. Consult a fitness professional before starting any new exercise program.
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-400 hover:to-purple-400 text-white font-bold transition-all shadow-lg"
      >
        <Save className="w-5 h-5" />
        Save Workout
      </button>
    </div>
  );
}
