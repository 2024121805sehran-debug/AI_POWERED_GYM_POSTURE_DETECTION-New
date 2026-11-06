import React, { useState, useEffect } from "react";
import { Trophy, Target, Flame, Award, ChevronRight } from "lucide-react";
import {
  calculateUserStats,
  checkAchievements,
  getMilestoneProgress,
  MILESTONES,
} from "../data/gamification";
import AchievementBadge from "./AchievementBadge";
import { GlassCard, StatCard, SectionHeader, GlassButton } from "./ui/GlassComponents";

export default function ProgressDashboard({ user, userProfile, history, onBack }) {
  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [milestoneProgress, setMilestoneProgress] = useState(null);

  useEffect(() => {
    if (history && history.length > 0) {
      const userStats = calculateUserStats(history);
      setStats(userStats);
      
      const unlockedAchievements = checkAchievements(userStats);
      setAchievements(unlockedAchievements);
      
      const progress = getMilestoneProgress(userStats.totalReps);
      setMilestoneProgress(progress);
    }
  }, [history]);

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No workout data yet</p>
          <p className="text-gray-500 text-sm mt-2">Complete workouts to see your progress</p>
          <GlassButton
            onClick={onBack}
            variant="primary"
            className="mt-4 px-4 py-2 font-medium"
          >
            Back to Dashboard
          </GlassButton>
        </div>
      </div>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <GlassButton
              onClick={onBack}
              variant="secondary"
              className="p-2"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </GlassButton>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Trophy className="text-amber-500" />
                Progress & Achievements
              </h1>
              <p className="text-gray-500">Track your fitness journey</p>
              {userProfile && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-indigo-600 font-semibold">{userProfile.name}</span>
                  {userProfile.fitnessGoal && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                      {userProfile.fitnessGoal}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Total Workouts"
          value={stats.totalWorkouts}
          color="indigo"
        />

        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Current Streak"
          value={`${stats.currentStreak} days`}
          color="amber"
        />

        <StatCard
          icon={<Award className="w-5 h-5" />}
          label="Achievements"
          value={`${unlockedCount}/${totalCount}`}
          color="violet"
        />

        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="Total Reps"
          value={stats.totalReps}
          color="emerald"
        />
      </div>

      {/* Streak Info */}
      <GlassCard>
        <SectionHeader
          title="Streak Information"
          subtitle="Your workout consistency"
          icon={<Flame className="w-5 h-5 text-amber-600" />}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-gray-600 text-sm mb-1">Current Streak</p>
            <p className="text-2xl font-bold text-gray-900">{stats.currentStreak} days</p>
          </div>
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
            <p className="text-gray-600 text-sm mb-1">Longest Streak</p>
            <p className="text-2xl font-bold text-gray-900">{stats.longestStreak} days</p>
          </div>
          <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100">
            <p className="text-gray-600 text-sm mb-1">Weekly Consistency</p>
            <p className="text-2xl font-bold text-gray-900">{stats.weeklyConsistency} days</p>
          </div>
        </div>
      </GlassCard>

      {/* Milestone Progress */}
      <GlassCard>
        <SectionHeader
          title="Rep Milestones"
          subtitle="Track your rep achievements"
          icon={<Target className="w-5 h-5 text-indigo-600" />}
        />
        <div className="space-y-4">
          {MILESTONES.map((milestone) => {
            const isCompleted = stats.totalReps >= milestone.reps;
            const isNext = milestoneProgress?.nextMilestone?.reps === milestone.reps;

            return (
              <div
                key={milestone.reps}
                className={`p-4 rounded-xl border ${
                  isCompleted
                    ? "bg-emerald-50 border-emerald-200"
                    : isNext
                    ? "bg-indigo-50 border-indigo-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{milestone.icon}</span>
                    <span className="text-gray-900 font-semibold">{milestone.name}</span>
                  </div>
                  {isCompleted && (
                    <span className="px-2 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold">
                      COMPLETED
                    </span>
                  )}
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isCompleted
                        ? "bg-emerald-500"
                        : isNext
                        ? "bg-indigo-500"
                        : "bg-gray-300"
                    }`}
                    style={{
                      width: isCompleted
                        ? 100
                        : Math.min(100, (stats.totalReps / milestone.reps) * 100),
                    }}
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  {stats.totalReps} / {milestone.reps} reps
                </p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Achievements */}
      <GlassCard>
        <SectionHeader
          title="Achievements"
          subtitle="Unlock badges by reaching goals"
          icon={<Award className="w-5 h-5 text-violet-600" />}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {achievements.map((achievement) => (
            <AchievementBadge key={achievement.id} achievement={achievement} size="sm" />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
