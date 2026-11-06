import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import ProfileSetup from "./ProfileSetup";
import UserMenu from "./UserMenu";
import MainFitnessDashboard from "./MainFitnessDashboard";
import GymDashboard from "./GymDashboard";
import ExerciseLibrary from "./ExerciseLibrary";
import ExerciseDetails from "./ExerciseDetails";
import GoalsModal from "./GoalsModal";
import WorkoutHistoryModal from "./WorkoutHistoryModal";
import ProgressDashboard from "./ProgressDashboard";
import WorkoutPlanner from "./WorkoutPlanner";
import WorkoutTemplates from "./WorkoutTemplates";
import AdaptiveRecommendations from "./AdaptiveRecommendations";
import BottomNavigation from "./ui/BottomNavigation";
import FullScreenCamera from "./FullScreenCamera";
import {
  Loader2,
  Dumbbell,
  Home,
  Video,
  User,
  ArrowLeft,
  Sparkles,
  Target,
  History,
  BarChart2,
  Trophy,
  Calendar,
} from "lucide-react";
import {
  getUserGoals,
  saveUserGoals,
  getWorkoutSessions,
} from "../data/workoutStorage";

export default function ProtectedApp() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState("login"); // login, register, profileSetup, dashboard
  const [currentView, setCurrentView] = useState("home"); // home, trainer, library, details, planner, progress, profile
  const [selectedExercise, setSelectedExercise] = useState(null);

  // Modals
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [workoutsList, setWorkoutsList] = useState([]);
  const [goalsData, setGoalsData] = useState(null);

  // Instant Guest Access Handler
  const handleContinueAsGuest = () => {
    const guestUser = {
      uid: "guest-athlete",
      email: "guest@aigym.local",
      displayName: "Guest Athlete",
      isAnonymous: true,
    };
    const guestProfile = {
      name: "Guest Athlete",
      age: 24,
      gender: "Male",
      height: 178,
      weight: 74,
      fitnessLevel: "Intermediate",
      fitnessGoal: "Muscle Building",
    };
    setUser(guestUser);
    setUserProfile(guestProfile);
    setAuthView("dashboard");
    setCurrentView("dashboard");
    setLoading(false);
  };

  // Auth State Listener with 1.5s Safety Timeout
  useEffect(() => {
    let isMounted = true;

    const timer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1500);

    let unsubscribe = () => {};

    try {
      unsubscribe = onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!isMounted) return;
          setUser(currentUser);

          if (currentUser) {
            try {
              const profileRef = doc(db, "users", currentUser.uid);
              const profileSnap = await Promise.race([
                getDoc(profileRef),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error("Profile timeout")), 2000)
                ),
              ]);

              if (profileSnap && profileSnap.exists()) {
                const profileData = profileSnap.data();
                setUserProfile(profileData);

                if (
                  !profileData.age ||
                  !profileData.gender ||
                  !profileData.height ||
                  !profileData.weight
                ) {
                  setAuthView("profileSetup");
                } else {
                  setAuthView("dashboard");
                }
              } else {
                setAuthView("profileSetup");
              }
            } catch (err) {
              console.warn("Could not load user profile:", err);
              setUserProfile({
                name: currentUser.displayName || currentUser.email || "Athlete",
                fitnessLevel: "Beginner",
                fitnessGoal: "General Fitness",
              });
              setAuthView("dashboard");
            }
          } else {
            setUserProfile(null);
            setAuthView("login");
          }

          if (isMounted) {
            setLoading(false);
          }
        },
        (authError) => {
          console.warn("Firebase Auth error:", authError);
          if (isMounted) {
            setUserProfile(null);
            setAuthView("login");
            setLoading(false);
          }
        }
      );
    } catch (err) {
      console.warn("Error subscribing to auth state:", err);
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  // Refresh workouts list
  const refreshWorkouts = async () => {
    const uid = user?.uid || "guest";
    const data = await getWorkoutSessions(uid);
    setWorkoutsList(data);
  };

  const handleLoginSuccess = () => {
    setAuthView("dashboard");
    setCurrentView("dashboard");
  };

  const handleRegisterSuccess = () => {
    setAuthView("profileSetup");
  };

  const handleProfileComplete = (updated) => {
    if (updated) setUserProfile(updated);
    setAuthView("dashboard");
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setUserProfile(null);
    setAuthView("login");
  };

  // Navigations
  const handleStartAIWorkout = (exercise = null) => {
    if (exercise) {
      setSelectedExercise(exercise);
    }
    setCurrentView("trainer");
  };

  const handleExerciseClick = (exercise) => {
    setSelectedExercise(exercise);
    setCurrentView("details");
  };

  const handleBackToLibrary = () => {
    setCurrentView("library");
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="text-center max-w-sm">
          <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
          <p className="text-white font-bold text-xl mb-1 tracking-tight">AI Gym Coach</p>
          <p className="text-slate-400 text-sm mb-6">Connecting to services...</p>
          <button
            onClick={handleContinueAsGuest}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded-xl text-sm font-semibold border border-slate-700 transition-all shadow-xl flex items-center justify-center gap-2 mx-auto"
          >
            <User className="w-4 h-4" />
            <span>Continue as Guest (Instant Access)</span>
          </button>
        </div>
      </div>
    );
  }

  // Auth Views
  if (!user) {
    if (authView === "login") {
      return (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => setAuthView("register")}
          onContinueAsGuest={handleContinueAsGuest}
        />
      );
    }
    if (authView === "register") {
      return (
        <RegisterPage
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => setAuthView("login")}
        />
      );
    }
  }

  // First-time Profile Setup View (Full Page)
  if (authView === "profileSetup" && user) {
    return (
      <ProfileSetup
        userProfile={userProfile || { name: user.displayName || "Athlete" }}
        onProfileComplete={handleProfileComplete}
      />
    );
  }

  // Authenticated Application Shell
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary pb-24">
      {/* AI Trainer Full-Screen Mode */}
      {currentView === "trainer" ? (
        <div className="fixed inset-0 z-50 bg-black">
          <FullScreenCamera
            user={user}
            selectedExercise={selectedExercise}
            onExit={() => setCurrentView("home")}
            onComplete={() => {
              refreshWorkouts();
              setCurrentView("home");
            }}
          />
        </div>
      ) : (
        <>
          {/* Top Header - Simplified */}
          <header className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-4">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div
                onClick={() => setCurrentView("home")}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-lg font-bold text-text-primary tracking-tight block leading-tight">
                    AI Gym Coach
                  </span>
                  <span className="text-[10px] font-medium text-brand-600 tracking-wider uppercase">
                    Premium Fitness
                  </span>
                </div>
              </div>

              <UserMenu
                userProfile={userProfile}
                onProfileClick={() => setShowProfileModal(true)}
                onGoalsClick={() => setShowGoalsModal(true)}
                onHistoryClick={() => {
                  refreshWorkouts();
                  setShowHistoryModal(true);
                }}
                onSettingsClick={() => setShowGoalsModal(true)}
                onLogout={handleLogout}
              />
            </div>
          </header>

      {/* Main View Area */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* 1. Home / Dashboard */}
        {currentView === "home" && (
          <MainFitnessDashboard
            user={user}
            userProfile={userProfile}
            onStartAIWorkout={handleStartAIWorkout}
            onBrowseLibrary={() => setCurrentView("exercises")}
            onViewExerciseDetails={handleExerciseClick}
            onProfileUpdated={(updated) => setUserProfile(updated)}
            onOpenPlanner={() => setCurrentView("planner")}
          />
        )}

        {/* 2. Exercise Library */}
        {currentView === "exercises" && (
          <ExerciseLibrary
            onSelectExercise={handleExerciseClick}
            onShowDetails={handleExerciseClick}
          />
        )}

        {/* 3. Exercise Details */}
        {currentView === "details" && selectedExercise && (
          <ExerciseDetails
            user={user}
            userProfile={userProfile}
            exerciseId={selectedExercise.id}
            onBack={() => setCurrentView("exercises")}
            onSelectExercise={handleStartAIWorkout}
          />
        )}

        {/* 4. Progress */}
        {currentView === "progress" && (
          <ProgressDashboard
            user={user}
            history={workoutsList}
            onBack={() => setCurrentView("home")}
          />
        )}

        {/* 5. Profile */}
        {currentView === "profile" && (
          <ProfileSetup
            userProfile={userProfile}
            isModal={false}
            onProfileComplete={(updated) => {
              setUserProfile(updated);
              setCurrentView("home");
            }}
          />
        )}

        {/* 6. Workout Planner */}
        {currentView === "planner" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView("home")}
                className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>

            <AdaptiveRecommendations
              userProfile={userProfile}
              workouts={workoutsList}
              onSelectRecommendation={(rec) => {
                const exercise = { name: rec.exercise };
                setSelectedExercise(exercise);
                setCurrentView("trainer");
              }}
            />

            <WorkoutTemplates
              onSelectTemplate={(template) => {
                setSelectedExercise({ name: template.exercises[0].exercise });
                setCurrentView("trainer");
              }}
            />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={currentView} onTabChange={setCurrentView} />
      </>
      )}

      {/* Global Modals */}
      {showGoalsModal && (
        <GoalsModal
          currentGoals={goalsData}
          onSaveGoals={async (newGoals) => {
            setGoalsData(newGoals);
            const uid = user?.uid || "guest";
            await saveUserGoals(uid, newGoals);
          }}
          onClose={() => setShowGoalsModal(false)}
        />
      )}

      {showHistoryModal && (
        <WorkoutHistoryModal
          workouts={workoutsList}
          onClose={() => setShowHistoryModal(false)}
          onSelectExercise={handleStartAIWorkout}
        />
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <ProfileSetup
              userProfile={userProfile}
              isModal={true}
              onClose={() => setShowProfileModal(false)}
              onProfileComplete={(updated) => {
                setUserProfile(updated);
                setShowProfileModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
