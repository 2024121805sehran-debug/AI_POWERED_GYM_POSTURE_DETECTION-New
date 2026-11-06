import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { updateProfile } from "firebase/auth";
import {
  User,
  Ruler,
  Scale,
  Calendar,
  Activity,
  Target,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { calculateBMI } from "../data/workoutStorage";
import { GlassCard, GlassButton } from "./ui/GlassComponents";

export const FITNESS_LEVELS = ["Beginner", "Intermediate", "Advanced"];

export const FITNESS_GOALS = [
  "Weight Management",
  "Muscle Building",
  "Strength",
  "Endurance",
  "General Fitness",
  "Mobility",
];

export default function ProfileSetup({ userProfile, onProfileComplete, isModal = false, onClose }) {
  const [formData, setFormData] = useState({
    name: userProfile?.name || auth.currentUser?.displayName || "Athlete",
    age: userProfile?.age || "",
    gender: userProfile?.gender || "Male",
    height: userProfile?.height || "",
    weight: userProfile?.weight || "",
    fitnessLevel: userProfile?.fitnessLevel || "Beginner",
    fitnessGoal: userProfile?.fitnessGoal || "General Fitness",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const bmiInfo = calculateBMI(parseFloat(formData.weight), parseFloat(formData.height));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccessMsg("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!formData.name.trim()) {
      setError("Please enter your name");
      return;
    }

    const ageNum = parseInt(formData.age, 10);
    if (!formData.age || isNaN(ageNum) || ageNum < 13 || ageNum > 100) {
      setError("Please enter a valid age between 13 and 100");
      return;
    }

    if (!formData.gender) {
      setError("Please select your gender");
      return;
    }

    const heightNum = parseFloat(formData.height);
    if (!formData.height || isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      setError("Please enter a valid height between 100 cm and 250 cm");
      return;
    }

    const weightNum = parseFloat(formData.weight);
    if (!formData.weight || isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      setError("Please enter a valid weight between 30 kg and 300 kg");
      return;
    }

    setLoading(true);
    try {
      const updatedProfile = {
        ...userProfile,
        name: formData.name.trim(),
        age: ageNum,
        gender: formData.gender,
        height: heightNum,
        weight: weightNum,
        fitnessLevel: formData.fitnessLevel,
        fitnessGoal: formData.fitnessGoal,
        bmi: bmiInfo?.bmi || null,
        bmiCategory: bmiInfo?.category || null,
        updatedAt: new Date().toISOString(),
      };

      const currentUser = auth.currentUser;
      if (currentUser && !currentUser.isAnonymous && currentUser.uid !== "guest-athlete") {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          await setDoc(userDocRef, updatedProfile, { merge: true });
        } catch (firestoreErr) {
          console.warn("Firestore profile write notice:", firestoreErr.message);
        }

        try {
          await updateProfile(currentUser, {
            displayName: formData.name.trim(),
          });
        } catch (authErr) {
          // Ignore
        }
      }

      // Also persist to localStorage for instant local reactivity
      const storageKey = `ai_gym_coach_profile_${currentUser?.uid || "guest"}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedProfile));

      setSuccessMsg("Fitness profile saved successfully!");
      setTimeout(() => {
        if (onProfileComplete) onProfileComplete(updatedProfile);
        if (onClose) onClose();
      }, 700);
    } catch (err) {
      setError("Failed to save profile. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full ${isModal ? "" : "min-h-screen flex items-center justify-center p-4 bg-gray-50"}`}>
      <div className={`w-full ${isModal ? "" : "max-w-2xl"}`}>
        {!isModal && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-4 shadow-md">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Personalize Your Profile
            </h1>
            <p className="text-gray-500 text-sm">
              Configure your body metrics and targets for accurate tracking.
            </p>
          </div>
        )}

        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <span>Fitness Profile</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Saved to your account
              </p>
            </div>
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors text-lg"
              >
                ✕
              </button>
            )}
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-xs mb-4">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-700 text-xs mb-4">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your Full Name"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Age (years)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="e.g. 25"
                    min="13"
                    max="100"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Gender
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Male", "Female", "Other"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, gender: g }))}
                      className={`py-3 px-2 rounded-xl text-xs font-semibold transition-all border ${
                        formData.gender === g
                          ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Height (cm)
                </label>
                <div className="relative">
                  <Ruler className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleInputChange}
                    placeholder="e.g. 178"
                    min="100"
                    max="250"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Weight (kg)
                </label>
                <div className="relative">
                  <Scale className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    placeholder="e.g. 75"
                    min="30"
                    max="300"
                    step="0.5"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {bmiInfo && (
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Calculated BMI:
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${bmiInfo.color}`}>
                    {bmiInfo.bmi} • {bmiInfo.category}
                  </span>
                </div>
                <p className="text-xs text-gray-700">{bmiInfo.description}</p>
                <p className="text-[11px] text-gray-500 italic pt-1 border-t border-indigo-200">
                  {bmiInfo.disclaimer}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Fitness Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {FITNESS_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, fitnessLevel: level }))}
                    className={`py-3 px-2 rounded-xl text-xs font-semibold transition-all border ${
                      formData.fitnessLevel === level
                        ? "bg-violet-100 border-violet-300 text-violet-700"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Fitness Goal
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {FITNESS_GOALS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, fitnessGoal: goal }))}
                    className={`p-3 rounded-xl text-xs font-semibold transition-all border text-left flex items-center gap-2 ${
                      formData.fitnessGoal === goal
                        ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Target className={`w-3.5 h-3.5 shrink-0 ${formData.fitnessGoal === goal ? "text-indigo-600" : "text-gray-400"}`} />
                    <span className="truncate">{goal}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              {!isModal && (
                <GlassButton
                  type="button"
                  onClick={() => onProfileComplete && onProfileComplete(userProfile)}
                  variant="secondary"
                  className="flex-1 py-3.5 font-medium text-sm"
                  disabled={loading}
                >
                  Skip for Now
                </GlassButton>
              )}

              <GlassButton
                type="submit"
                disabled={loading}
                variant="primary"
                className="flex-1 flex items-center justify-center gap-2 py-3.5 font-semibold text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Save Profile</span>
                  </>
                )}
              </GlassButton>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
