import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Play,
  Video,
  Target,
  Dumbbell,
  AlertTriangle,
  XCircle,
  Wind,
  ShieldAlert,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { getExerciseById, getYoutubeEmbedUrl } from "../data/exercises";
import { GlassCard, GlassButton, SectionHeader } from "./ui/GlassComponents";

export default function ExerciseDetails({
  user,
  userProfile,
  userMenu,
  exerciseId,
  onBack,
  onSelectExercise,
}) {
  const [exercise, setExercise] = useState(null);

  useEffect(() => {
    if (exerciseId) {
      const ex = getExerciseById(exerciseId);
      setExercise(ex);
    }
  }, [exerciseId]);

  if (!exercise) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400">
          <Dumbbell className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Exercise Not Found</h2>
        <p className="text-gray-500 text-sm mb-6">
          The requested exercise could not be found in the library.
        </p>
        <GlassButton
          onClick={onBack}
          variant="primary"
          className="px-6 py-3 font-semibold inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Library</span>
        </GlassButton>
      </div>
    );
  }

  const handleStartAI = () => {
    if (onSelectExercise) {
      onSelectExercise(exercise);
    }
  };

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "beginner":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "intermediate":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "advanced":
        return "bg-rose-100 text-rose-700 border-rose-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const embedUrl = getYoutubeEmbedUrl(exercise.tutorialUrl);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <GlassButton
          onClick={onBack}
          variant="secondary"
          className="flex items-center gap-2 px-4 py-2.5 font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </GlassButton>

        <div className="flex items-center gap-3">
          {exercise.aiSupported && (
            <span className="px-3 py-1.5 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-600 text-xs font-semibold">
              AI Ready
            </span>
          )}
          {userMenu}
        </div>
      </div>

      {/* Hero Header */}
      <GlassCard className="relative overflow-hidden bg-gradient-to-br from-white via-indigo-50/50 to-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-violet-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${getDifficultyBadge(
                  exercise.difficulty
                )}`}
              >
                {exercise.difficulty}
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-600 text-xs font-medium capitalize">
                {exercise.exerciseType}
              </span>
              <span className="px-3 py-1 rounded-full bg-violet-100 border border-violet-200 text-violet-600 text-xs font-medium capitalize">
                {exercise.muscleGroup}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              {exercise.name}
            </h1>

            <p className="text-gray-600 text-base md:text-lg leading-relaxed">
              {exercise.overview || exercise.description}
            </p>
          </div>

          {exercise.aiSupported && (
            <div className="shrink-0">
              <GlassButton
                onClick={handleStartAI}
                variant="primary"
                className="flex items-center justify-center gap-3 px-8 py-4 font-bold text-lg"
              >
                <Play className="w-6 h-6 fill-current" />
                <span>Practice with AI</span>
              </GlassButton>
            </div>
          )}
        </div>

        <div className="relative z-10 mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-white border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>Primary Muscles</span>
            </div>
            <p className="text-gray-900 font-semibold text-sm truncate">
              {exercise.muscles.slice(0, 2).join(", ")}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Dumbbell className="w-3.5 h-3.5 text-violet-600" />
              <span>Equipment</span>
            </div>
            <p className="text-gray-900 font-semibold text-sm truncate">
              {exercise.equipment.join(", ") || "Bodyweight"}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Rep Counting</span>
            </div>
            <p className="text-emerald-600 font-semibold text-sm">Supported</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>Posture Cues</span>
            </div>
            <p className="text-indigo-600 font-semibold text-sm">Real-Time</p>
          </div>
        </div>
      </GlassCard>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Instructions */}
          <GlassCard>
            <SectionHeader
              title="Step-by-Step Instructions"
              subtitle="Follow these steps for proper form"
            />

            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-2 mb-4">
              <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider">
                Starting Position
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {exercise.startingPosition}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Execution Steps
              </h3>
              <div className="space-y-2.5">
                {exercise.movementSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3.5 p-3.5 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <span className="shrink-0 w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 font-mono text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <p className="text-gray-700 text-sm leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 space-y-1.5 mt-4">
              <h3 className="text-sm font-semibold text-sky-700 uppercase tracking-wider flex items-center gap-2">
                <Wind className="w-4 h-4 text-sky-600" />
                Breathing Guidance
              </h3>
              <p className="text-sky-800 text-sm leading-relaxed">
                {exercise.breathingGuidance || exercise.breathing}
              </p>
            </div>
          </GlassCard>

          {/* Common Mistakes */}
          <GlassCard>
            <SectionHeader
              title="Common Mistakes"
              subtitle="Avoid these errors for better form"
              icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exercise.commonMistakes.map((mistake, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-lg bg-rose-50 border border-rose-100"
                >
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm leading-snug">{mistake}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Safety Notes */}
          <GlassCard className="bg-amber-50 border-amber-200">
            <div className="flex items-center gap-2.5 text-amber-800 mb-3">
              <ShieldAlert className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Safety Notes</h2>
            </div>
            <p className="text-amber-900 text-sm leading-relaxed">
              {exercise.safetyNotes}
            </p>
          </GlassCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Visual */}
          <GlassCard>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Exercise Visual
            </h3>
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-6 flex items-center justify-center mb-3">
              <Dumbbell className="w-16 h-16 text-indigo-600" />
            </div>
            <p className="text-gray-500 text-xs text-center">
              Tracked Landmarks: {exercise.angles.join(", ")}
            </p>
          </GlassCard>

          {/* Tutorial Video */}
          <GlassCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Tutorial Video
              </h3>
              {exercise.tutorialUrl && (
                <a
                  href={exercise.tutorialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <span>Open YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {embedUrl ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900 border border-gray-200">
                <iframe
                  src={embedUrl}
                  title={`${exercise.name} Tutorial`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-gray-50 border border-gray-200 text-center space-y-2">
                <Video className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-gray-500 text-xs">
                  Tutorial video coming soon. Follow the instructions above.
                </p>
              </div>
            )}
          </GlassCard>

          {/* AI Metrics */}
          {exercise.aiSupported && (
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                AI-Detectable Metrics
              </h3>

              <div className="space-y-2">
                {exercise.aiDetectableMetrics?.map((metric, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                  >
                    <span className="text-gray-700 font-medium">{metric}</span>
                    <span className="text-emerald-600 font-semibold">Live</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 mt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2 font-medium">Joint Angles:</p>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.angles.map((angle) => (
                    <span
                      key={angle}
                      className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 text-xs font-medium"
                    >
                      {angle}
                    </span>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {/* Muscles */}
          <GlassCard>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-100 pb-3">
              Target Muscles
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {exercise.muscles.map((muscle) => (
                <span
                  key={muscle}
                  className="px-2.5 py-1 rounded-md bg-violet-100 text-violet-700 text-xs font-medium"
                >
                  {muscle}
                </span>
              ))}
            </div>

            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">Equipment:</p>
              <div className="flex flex-wrap gap-1.5">
                {exercise.equipment.map((eq) => (
                  <span
                    key={eq}
                    className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs"
                  >
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          </GlassCard>

          {exercise.aiSupported && (
            <GlassButton
              onClick={handleStartAI}
              variant="primary"
              className="w-full py-4 font-bold flex items-center justify-center gap-3"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Practice with AI</span>
            </GlassButton>
          )}
        </div>
      </div>
    </div>
  );
}
