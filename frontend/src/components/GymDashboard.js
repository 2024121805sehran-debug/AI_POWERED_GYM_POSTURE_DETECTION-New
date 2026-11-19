import { useEffect, useRef, useState, useCallback } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { saveWorkoutSession } from "../data/workoutStorage";
import {
  calculateUserStats,
  checkAchievements,
  getNewAchievements,
  saveAchievements,
  loadAchievements,
  getMilestoneProgress,
  MILESTONES,
  ACHIEVEMENTS,
} from "../data/gamification";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Play,
  Square,
  RotateCcw,
  History,
  BarChart3,
  Dumbbell,
  Video,
  Wifi,
  WifiOff,
  ChevronUp,
  Clock,
  Wind,
  Settings,
  ShieldAlert,
  Trophy,
  TrendingUp,
  Flame,
  SkipForward,
  Target,
  Zap,
  XCircle,
  ArrowLeft,
  VolumeX,
} from "lucide-react";
import CelebrationModal from "./CelebrationModal";
import WorkoutSummaryModal from "./WorkoutSummaryModal";
import MediaPipePoseOverlay from "./MediaPipePoseOverlay";

// Utility for class names
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function GymDashboard({ user, userProfile, userMenu, selectedExercise, onClearExercise, onWorkoutComplete, onExit }) {
  // ---------- State ----------
  const [posture, setPosture] = useState({
    exercise: "Waiting...",
    status: "correct",
    issue: "Start AI detection to begin",
    rep_count: 0,
    angles: {},
    feedback: [],
    form_score: 0,
    current_set: 1,
    set_reps: 0,
    target_reps: 10,
    in_rest: false,
    rest_duration: 0,
    average_tempo: 0,
    confidence: 0,
    injury_warnings: 0,
    voice_feedback: null,
    rom_data: {},
    fatigue_score: 0,
  });
  const [backendRunning, setBackendRunning] = useState(false);
  const [backendMsg, setBackendMsg] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [history, setHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showWorkoutSummary, setShowWorkoutSummary] = useState(false);
  const [workoutSummary, setWorkoutSummary] = useState(null);
  const [targetReps, setTargetReps] = useState(10);
  const [stats, setStats] = useState({
    totalReps: 0,
    correctReps: 0,
    wrongReps: 0,
    injuryAlerts: 0,
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Advanced AI settings
  const [voiceCoachEnabled, setVoiceCoachEnabled] = useState(true);
  const [riskWarningsEnabled, setRiskWarningsEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Gamification
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState(null);
  
  // Workout Summary
  const [showAIWorkoutSummary, setShowAIWorkoutSummary] = useState(false);

  // MediaPipe in-browser pose detection toggle
  const [mediapipeActive, setMediapipeActive] = useState(false);

  // Handle real-time status from MediaPipe (browser-side)
  const handleMediaPipeStatus = useCallback((mpStatus, mpIssue, mpLandmarks) => {
    setPosture(prev => ({
      ...prev,
      status: mpStatus === "detecting" ? prev.status : mpStatus,
      issue: mpIssue || prev.issue,
    }));
    if (mpStatus === "correct" || mpStatus === "wrong") {
      setStats(prev => ({
        ...prev,
        totalReps: prev.totalReps,
        correctReps: mpStatus === "correct" ? prev.correctReps + 1 : prev.correctReps,
        wrongReps:   mpStatus === "wrong"   ? prev.wrongReps   + 1 : prev.wrongReps,
      }));
    }
  }, []);

  // ---------- Handle Selected Exercise ----------
  useEffect(() => {
    if (selectedExercise) {
      setPosture(prev => ({
        ...prev,
        exercise: selectedExercise.name
      }));
      setBackendMsg(`Selected: ${selectedExercise.name}. Start AI detection to begin.`);
    }
  }, [selectedExercise]);

  // ---------- Refs ----------
  const lastLoggedStatusRef = useRef("");
  const sessionStartTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const wsRef = useRef(null);
  const API = "http://localhost:8000";

  // ---------- Backend Control ----------
  const refreshBackendStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/status`);
      const data = await res.json();
      setBackendRunning(data.running);
      setSessionId(data.session_id);
      setStats({
        totalReps: data.reps || 0,
        correctReps: data.correct_reps || 0,
        wrongReps: data.wrong_reps || 0,
        injuryAlerts: data.injury_alerts || 0,
      });
      if (data.running) {
        setBackendMsg("");
      }
    } catch {
      setBackendRunning(false);
      setBackendMsg("Backend server not reachable");
    }
  }, [API]);

  const startBackend = async () => {
    setBackendMsg("Initializing AI detection...");
    try {
      const res = await fetch(`${API}/start`, { method: "POST" });
      const data = await res.json();
      setSessionId(data.session_id);
      setBackendMsg(data.msg);
      sessionStartTimeRef.current = Date.now();
      startTimer();
      setTimeout(refreshBackendStatus, 1000);
    } catch {
      setBackendMsg("Failed to start backend");
    }
  };

  const stopBackend = async () => {
    setBackendMsg("Stopping AI detection...");
    try {
      await fetch(`${API}/stop`, { method: "POST" });
      setBackendMsg("Detection stopped");
      stopTimer();
      setTimeout(refreshBackendStatus, 1000);
    } catch {
      setBackendMsg("Failed to stop backend");
    }
  };

  const resetBackend = async () => {
    setBackendMsg("Resetting AI detection...");
    try {
      await fetch(`${API}/reset`, { method: "POST" });
      setBackendMsg("Detection reset");
      setTimeout(refreshBackendStatus, 1000);
    } catch {
      setBackendMsg("Failed to reset backend");
    }
  };

  const updateTargetReps = async (target) => {
    try {
      await fetch(`${API}/set-target-reps?target=${target}`, { method: "POST" });
      setTargetReps(target);
    } catch {
      setBackendMsg("Failed to set target reps");
    }
  };

  const toggleVoiceCoach = async () => {
    try {
      const res = await fetch(`${API}/toggle-voice-coach?enabled=${!voiceCoachEnabled}`, { method: "POST" });
      const data = await res.json();
      setVoiceCoachEnabled(data.voice_coach_enabled);
      setBackendMsg(`Voice coach ${data.voice_coach_enabled ? 'enabled' : 'disabled'}`);
    } catch {
      setBackendMsg("Failed to toggle voice coach");
    }
  };

  const toggleRiskWarnings = async () => {
    try {
      const res = await fetch(`${API}/toggle-risk-warnings?enabled=${!riskWarningsEnabled}`, { method: "POST" });
      const data = await res.json();
      setRiskWarningsEnabled(data.risk_warnings_enabled);
      setBackendMsg(`Risk warnings ${data.risk_warnings_enabled ? 'enabled' : 'disabled'}`);
    } catch {
      setBackendMsg("Failed to toggle risk warnings");
    }
  };

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(`${API}/settings`);
        const data = await res.json();
        setVoiceCoachEnabled(data.voice_coach_enabled);
        setRiskWarningsEnabled(data.risk_warnings_enabled);
      } catch {
        // Ignore if backend not running
      }
    };
    loadSettings();
  }, []);

  // Load achievements on mount
  useEffect(() => {
    const loadUserAchievements = async () => {
      if (user && !user.isAnonymous && user.uid !== "guest-athlete") {
        try {
          const achievements = await loadAchievements(user.uid, db);
          setUnlockedAchievements(achievements);
        } catch {
          // Ignore if Firestore not available
        }
      }
    };
    loadUserAchievements();
  }, [user]);

  const skipRest = async () => {
    try {
      await fetch(`${API}/skip-rest`, { method: "POST" });
      setBackendMsg("Rest skipped");
    } catch {
      setBackendMsg("Failed to skip rest");
    }
  };

  const completeWorkout = async () => {
    if (!user) return;
    setBackendMsg("Saving workout...");

    const accuracy = stats.totalReps > 0 ? Math.round((stats.correctReps / stats.totalReps) * 100) : 0;
    const sessionRecord = {
      exercise: selectedExercise?.name || (posture.exercise !== "Waiting..." ? posture.exercise : "Workout Session"),
      totalReps: stats.totalReps,
      correctReps: stats.correctReps,
      wrongReps: stats.wrongReps,
      formScore: accuracy,
      duration: elapsedTime,
      injuryAlerts: stats.injuryAlerts,
      timestamp: new Date().toISOString(),
      // Preserve feedback & posture issue for mistake analytics
      feedback: Array.isArray(posture.feedback) ? [...posture.feedback] : [],
      issue: posture.issue && posture.issue !== "Start AI detection to begin" ? posture.issue : "",
      current_set: posture.current_set || 1,
    };

    // Save directly to storage (Firestore & local cache)
    try {
      await saveWorkoutSession(user.uid, sessionRecord);
    } catch (err) {
      console.warn("Storage write error:", err);
    }

    try {
      const res = await fetch(`${API}/complete-workout?user_id=${user.uid}`, { method: "POST" });
      const data = await res.json();
      setWorkoutSummary(data.summary || sessionRecord);
      setShowWorkoutSummary(true);
      setBackendMsg("Workout saved!");
    } catch {
      setWorkoutSummary(sessionRecord);
      setShowWorkoutSummary(true);
      setBackendMsg("Workout saved!");
    }

    // Check for new achievements
    if (history && history.length > 0) {
      const allWorkouts = [...history, sessionRecord];
      const currentStats = calculateUserStats(allWorkouts);
      const previousStats = calculateUserStats(history);
      
      const newAchievements = getNewAchievements(
        currentStats,
        previousStats,
        unlockedAchievements
      );

      if (newAchievements.length > 0) {
        // Save new achievements
        const newAchievementIds = newAchievements.map((a) => a.id);
        const allAchievementIds = [...new Set([...unlockedAchievements, ...newAchievementIds])];
        setUnlockedAchievements(allAchievementIds);
        
        if (user && !user.isAnonymous && user.uid !== "guest-athlete") {
          await saveAchievements(user.uid, allAchievementIds, db);
        }

        // Show celebration for first new achievement
        const firstAchievement = newAchievements[0];
        setCelebrationData({
          type: "achievement",
          title: firstAchievement.name,
          message: firstAchievement.description,
          icon: firstAchievement.icon,
        });
        setShowCelebration(true);
      }

      // Check for milestone completion
      const milestoneProgress = getMilestoneProgress(currentStats.totalReps);
      if (milestoneProgress.completed && milestoneProgress.nextMilestone === null) {
        // Just completed a milestone
        const lastMilestone = sessionRecord.totalReps;
        const milestone = MILESTONES.find((m) => m.reps === lastMilestone);
        if (milestone) {
          setCelebrationData({
            type: "milestone",
            title: milestone.name,
            message: "You've reached a major milestone!",
            icon: milestone.icon,
          });
          setShowCelebration(true);
        }
      }

      // Show workout summary after celebration (or immediately if no celebration)
      setTimeout(() => {
        setShowAIWorkoutSummary(true);
      }, newAchievements.length > 0 ? 5500 : 100);
    }

    if (onWorkoutComplete) {
      onWorkoutComplete(sessionRecord);
    }
  };

  // ---------- Timer ----------
  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    sessionStartTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      if (sessionStartTimeRef.current) {
        setElapsedTime(Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // ---------- WebSocket ----------
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    wsRef.current = new WebSocket("ws://localhost:8000/ws");

    wsRef.current.onopen = () => {
      setWsConnected(true);
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPosture(prev => ({
        ...prev,
        ...data,
        voice_feedback: data.voice_feedback || null,
        rom_data: data.rom_data || {},
        fatigue_score: data.fatigue_score || 0,
      }));
      setStats(prev => ({
        totalReps: data.rep_count || prev.totalReps,
        correctReps: data.status === "correct" ? prev.correctReps + 1 : prev.correctReps,
        wrongReps: data.status === "wrong" ? prev.wrongReps + 1 : prev.wrongReps,
        injuryAlerts: data.injury_warnings || prev.injuryAlerts,
      }));
    };

    wsRef.current.onerror = () => {
      setWsConnected(false);
    };

    wsRef.current.onclose = () => {
      setWsConnected(false);
    };
  }, []);

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
  };

  const toggleLive = () => {
    if (wsConnected) {
      disconnectWebSocket();
    } else {
      connectWebSocket();
    }
  };

  // ---------- Firestore (User-Specific) ----------
  useEffect(() => {
    // If not logged in, or in guest/anonymous mode, don't query Firestore
    if (!user || user.isAnonymous || user.uid === "guest-athlete") {
      return;
    }

    let unsubscribeHistory = () => {};
    let unsubscribeSessions = () => {};

    try {
      // User-specific history
      const historyQuery = query(
        collection(db, "users", user.uid, "postureHistory"),
        orderBy("timestamp", "desc"),
        limit(50)
      );
      
      unsubscribeHistory = onSnapshot(
        historyQuery,
        (snapshot) => {
          const historyData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setHistory(historyData);
        },
        (error) => {
          console.warn("Firestore history listener notice:", error.message);
        }
      );

      // User-specific sessions
      const sessionsQuery = query(
        collection(db, "users", user.uid, "sessions"),
        orderBy("start_time", "desc"),
        limit(20)
      );

      unsubscribeSessions = onSnapshot(
        sessionsQuery,
        (snapshot) => {
          const sessionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setSessions(sessionsData);
        },
        (error) => {
          console.warn("Firestore sessions listener notice:", error.message);
        }
      );
    } catch (err) {
      console.warn("Failed to initialize Firestore listeners:", err);
    }

    return () => {
      if (typeof unsubscribeHistory === "function") unsubscribeHistory();
      if (typeof unsubscribeSessions === "function") unsubscribeSessions();
    };
  }, [user]);

  // ---------- Lifecycle ----------
  useEffect(() => {
    refreshBackendStatus();
    const interval = setInterval(refreshBackendStatus, 3000);
    return () => clearInterval(interval);
  }, [refreshBackendStatus]);

  useEffect(() => {
    if (backendRunning) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }
    return () => disconnectWebSocket();
  }, [backendRunning, connectWebSocket]);

  // ---------- UI Helpers ----------
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getAccuracy = () => {
    if (stats.totalReps === 0) return 0;
    return Math.round((stats.correctReps / stats.totalReps) * 100);
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      {/* Selected Exercise Indicator */}
      {selectedExercise && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 border border-sky-500/40 p-4 mb-6 backdrop-blur-md shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-semibold">
                    Targeted Exercise
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <h3 className="text-white font-bold text-lg">{selectedExercise.name}</h3>
                <p className="text-slate-400 text-xs">
                  {selectedExercise.muscles ? selectedExercise.muscles.join(" • ") : selectedExercise.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {!backendRunning ? (
                <button
                  onClick={startBackend}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Camera &amp; AI</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Tracking Form Live</span>
                </div>
              )}

              <button
                onClick={onClearExercise}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Clear selected exercise"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Camera & Controls */}
        <div className="lg:col-span-3 space-y-6">
          {/* Camera Section */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Video className="text-sky-400" />
                Camera Feed
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={startBackend}
                  disabled={backendRunning}
                  className="btn-success flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  Start AI
                </button>
                <button
                  onClick={stopBackend}
                  disabled={!backendRunning}
                  className="btn-danger flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
                <button
                  onClick={resetBackend}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-slate-700 hover:bg-slate-600 text-white transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
                <button
                  onClick={completeWorkout}
                  disabled={!backendRunning}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </button>
              </div>
            </div>

            {backendMsg && (
              <div className="mb-4 p-3 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 text-sm">
                {backendMsg}
              </div>
            )}

            {/* Injury Warning */}
            {riskWarningsEnabled && posture.issue && posture.issue.toLowerCase().includes("injury") && (
              <div className="mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="text-white font-semibold">MOVEMENT RISK DETECTED</span>
                </div>
                <p className="text-red-300 text-sm mb-2">{posture.issue}</p>
                <p className="text-red-400 text-xs">
                  Consider stopping and resetting your position. If pain persists, seek medical attention.
                </p>
              </div>
            )}

            {/* Voice Coach Feedback */}
            {voiceCoachEnabled && posture.voice_feedback && (
              <div className="mb-4 p-3 rounded-lg bg-sky-500/20 border border-sky-500/30">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-sky-400" />
                  <span className="text-sky-300 text-sm font-medium">{posture.voice_feedback}</span>
                </div>
              </div>
            )}

            {/* Settings Toggle */}
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-all"
              >
                <Settings className="w-4 h-4" />
                <span>AI Settings</span>
              </button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="mb-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-sky-400" />
                      <span className="text-white text-sm">Voice Coach</span>
                    </div>
                    <button
                      onClick={toggleVoiceCoach}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        voiceCoachEnabled
                          ? "bg-sky-500 text-white"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {voiceCoachEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-orange-400" />
                      <span className="text-white text-sm">Risk Warnings</span>
                    </div>
                    <button
                      onClick={toggleRiskWarnings}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        riskWarningsEnabled
                          ? "bg-orange-500 text-white"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {riskWarningsEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MediaPipe toggle button */}
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={() => setMediapipeActive(!mediapipeActive)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  mediapipeActive
                    ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                    : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                }`}
              >
                <Activity className="w-4 h-4" />
                {mediapipeActive ? "MediaPipe ON" : "Enable MediaPipe (Browser)"}
              </button>
              {mediapipeActive && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  Real-time skeleton active
                </span>
              )}
            </div>

            {/* Camera feed — MediaPipe overlay OR Python backend img */}
            <div className="video-container rounded-xl overflow-hidden bg-slate-900">
              {mediapipeActive ? (
                <MediaPipePoseOverlay
                  exerciseName={selectedExercise?.name || posture.exercise || ""}
                  onStatusChange={handleMediaPipeStatus}
                  active={mediapipeActive}
                />
              ) : (
                <img
                  src={`${API}/video?clean=false`}
                  alt="Camera Feed with Skeleton"
                  className="w-full h-auto"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML = `
                      <div class="flex items-center justify-center h-64 text-slate-400">
                        <div class="text-center">
                          <p class="text-sm mb-1">Backend camera unavailable</p>
                          <p class="text-xs opacity-60">Enable MediaPipe above for browser-based detection</p>
                        </div>
                      </div>
                    `;
                  }}
                />
              )}
            </div>
          </div>

          {/* Posture Feedback */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="text-sky-400" />
              Posture Analysis
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {/* Exercise & Status */}
              <div className={`p-3 rounded-xl ${
                posture.status === "correct" ? "status-correct" : "status-wrong"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-semibold text-sm">{posture.exercise}</span>
                  {posture.status === "correct" ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-white" />
                  )}
                </div>
                <p className="text-white/90 text-xs">{posture.issue?.substring(0, 30)}</p>
              </div>

              {/* Rep Counter */}
              <div className="rep-counter p-3 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-semibold text-sm">Reps</span>
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <p className="text-2xl font-bold text-white">{posture.rep_count}</p>
              </div>

              {/* Form Score */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-semibold text-sm">Form</span>
                  <Trophy className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-2xl font-bold text-white">{posture.form_score?.toFixed(0) || 0}</p>
              </div>

              {/* Set Tracking */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-semibold text-sm">Set</span>
                  <Target className="w-4 h-4 text-sky-400" />
                </div>
                <p className="text-lg font-bold text-white">
                  {posture.current_set} / {posture.set_reps}/{posture.target_reps}
                </p>
              </div>
            </div>

            {/* Rest Detection */}
            {posture.in_rest && (
              <div className="mb-4 p-4 rounded-xl bg-orange-500/20 border border-orange-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-400" />
                    <span className="text-white font-semibold">REST PERIOD</span>
                  </div>
                  <span className="text-white font-bold">{formatTime(Math.floor(posture.rest_duration))}</span>
                </div>
                <button
                  onClick={skipRest}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-all"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip Rest
                </button>
              </div>
            )}

            {/* Tempo */}
            {posture.average_tempo > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-sky-400" />
                    <span className="text-white font-semibold text-sm">Avg Tempo</span>
                  </div>
                  <span className="text-white font-bold">{posture.average_tempo.toFixed(1)}s/rep</span>
                </div>
              </div>
            )}

            {/* ROM Data */}
            {posture.rom_data && Object.keys(posture.rom_data).length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="text-white font-semibold text-sm">Range of Motion</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(posture.rom_data).slice(0, 3).map(([angle, data]) => (
                    <div key={angle} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{angle}</span>
                      <span className="text-white">
                        {data.min?.toFixed(0)}° - {data.max?.toFixed(0)}°
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fatigue Score */}
            {posture.fatigue_score > 0.3 && (
              <div className="mb-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-orange-400" />
                    <span className="text-white font-semibold text-sm">Fatigue</span>
                  </div>
                  <span className="text-white font-bold">
                    {(posture.fatigue_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Target Reps Input */}
            <div className="mb-4 flex items-center gap-2">
              <label className="text-white text-sm font-medium">Target Reps:</label>
              <input
                type="number"
                min="1"
                max="50"
                value={targetReps}
                onChange={(e) => setTargetReps(parseInt(e.target.value) || 10)}
                onBlur={() => setTargetReps(targetReps)}
                className="w-20 px-3 py-1 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
              />
              <button
                onClick={() => updateTargetReps(targetReps)}
                className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition-all"
              >
                Set
              </button>
            </div>

            {/* Feedback */}
            {posture.feedback && posture.feedback.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  Feedback
                </h3>
                <ul className="space-y-1">
                  {posture.feedback.map((fb, idx) => (
                    <li key={idx} className="text-slate-300 text-sm">
                      • {fb}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Stats & History - Now below camera in wide layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Session Stats */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="text-sky-400" />
              Session Stats
            </h2>

            <div className="space-y-3">
              <div className="stat-card p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Total Reps</span>
                  <span className="text-white font-bold text-xl">{stats.totalReps}</span>
                </div>
              </div>

              <div className="stat-card p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Correct</span>
                  <span className="text-green-400 font-bold text-xl">{stats.correctReps}</span>
                </div>
              </div>

              <div className="stat-card p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Wrong</span>
                  <span className="text-red-400 font-bold text-xl">{stats.wrongReps}</span>
                </div>
              </div>

              <div className="stat-card p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Accuracy</span>
                  <span className="text-sky-400 font-bold text-xl">{getAccuracy()}%</span>
                </div>
              </div>

              <div className="stat-card p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Duration
                  </span>
                  <span className="text-white font-bold text-xl">{formatTime(elapsedTime)}</span>
                </div>
              </div>

              <div className="stat-card p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-purple-400" />
                    Achievements
                  </span>
                  <span className="text-purple-400 font-bold text-xl">
                    {unlockedAchievements.length}/{ACHIEVEMENTS.length}
                  </span>
                </div>
              </div>

              <div className="stat-card p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Injury Alerts</span>
                  <span className="text-orange-400 font-bold text-xl">{stats.injuryAlerts}</span>
                </div>
              </div>
            </div>
          </div>

          {/* History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full glass-card rounded-2xl p-4 flex items-center justify-between hover:bg-slate-800/50 transition-all"
          >
            <div className="flex items-center gap-2">
              <History className="text-sky-400" />
              <span className="text-white font-medium">Workout History</span>
            </div>
            <ChevronUp
              className={`w-5 h-5 text-slate-400 transition-transform ${
                showHistory ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* History Panel */}
          {showHistory && (
            <div className="glass-card rounded-2xl p-6 max-h-96 overflow-y-auto">
              <h3 className="text-white font-semibold mb-4">Recent Workouts</h3>
              {history.length === 0 ? (
                <p className="text-slate-400 text-sm">No workout history yet</p>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white font-medium text-sm">{item.exercise}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.status === "correct" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">{new Date(item.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Workout Summary Modal */}
      {showWorkoutSummary && workoutSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Trophy className="text-yellow-400" />
                Workout Complete!
              </h2>
              <button
                onClick={() => setShowWorkoutSummary(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Total Exercises</p>
                <p className="text-2xl font-bold text-white">{workoutSummary.total_exercises}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Total Sets</p>
                <p className="text-2xl font-bold text-white">{workoutSummary.total_sets}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Total Reps</p>
                <p className="text-2xl font-bold text-white">{workoutSummary.total_reps}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Duration</p>
                <p className="text-2xl font-bold text-white">{formatTime(Math.floor(workoutSummary.duration_seconds || 0))}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/30">
                <p className="text-green-400 text-sm mb-1">Correct Reps</p>
                <p className="text-2xl font-bold text-white">{workoutSummary.correct_reps}</p>
              </div>
              <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30">
                <p className="text-red-400 text-sm mb-1">Wrong Reps</p>
                <p className="text-2xl font-bold text-white">{workoutSummary.wrong_reps}</p>
              </div>
              <div className="p-4 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
                <p className="text-yellow-400 text-sm mb-1">Avg Form Score</p>
                <p className="text-2xl font-bold text-white">{workoutSummary.average_form_score}</p>
              </div>
              <div className="p-4 rounded-xl bg-sky-500/20 border border-sky-500/30">
                <p className="text-sky-400 text-sm mb-1">Best Rep</p>
                <p className="text-2xl font-bold text-white">{workoutSummary.best_rep}</p>
              </div>
            </div>

            {workoutSummary.injury_warnings > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="text-white font-semibold">Injury Warnings</span>
                </div>
                <p className="text-red-300 text-sm">
                  {workoutSummary.injury_warnings} injury risk event(s) detected during workout.
                  Please review your form and consider reducing weight or taking breaks.
                </p>
              </div>
            )}

            <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
              <h3 className="text-white font-semibold mb-2">Most Common Mistake</h3>
              <p className="text-slate-300">{workoutSummary.most_common_mistake}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWorkoutSummary(false);
                  resetBackend();
                }}
                className="flex-1 btn-success flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all"
              >
                <CheckCircle className="w-5 h-5" />
                Start New Workout
              </button>
              <button
                onClick={() => setShowWorkoutSummary(false)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium bg-slate-700 hover:bg-slate-600 text-white transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration Modal */}
      {showCelebration && celebrationData && (
        <CelebrationModal
          isOpen={showCelebration}
          onClose={() => setShowCelebration(false)}
          type={celebrationData.type}
          title={celebrationData.title}
          message={celebrationData.message}
          icon={celebrationData.icon}
        />
      )}

      {/* Workout Summary Modal */}
      {showAIWorkoutSummary && (
        <WorkoutSummaryModal
          workout={workoutSummary || {
            exercise: selectedExercise?.name || posture.exercise,
            totalReps: stats.totalReps,
            correctReps: stats.correctReps,
            wrongReps: stats.wrongReps,
            formScore: getAccuracy(),
            duration: elapsedTime,
            injuryAlerts: stats.injuryAlerts,
            issue: posture.issue,
          }}
          history={history}
          onClose={() => setShowAIWorkoutSummary(false)}
        />
      )}
    </div>
  );
}

export default GymDashboard;
