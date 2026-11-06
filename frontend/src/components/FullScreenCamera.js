import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Play, Square, CheckCircle, XCircle, Activity, Clock, Wind, SkipForward } from "lucide-react";
import MediaPipePoseOverlay from "./MediaPipePoseOverlay";

export default function FullScreenCamera({ user, selectedExercise, onExit, onComplete }) {
  const [backendRunning, setBackendRunning] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [posture, setPosture] = useState({
    exercise: "Waiting...",
    status: "wrong", // Default to incorrect
    issue: "Stand in front of camera and start exercising",
    rep_count: 0,
    angles: {},
    feedback: [],
    form_score: 0,
    current_set: 1,
    set_reps: 0,
    target_reps: 10,
    in_rest: false,
    rest_duration: 0,
    voice_feedback: null,
  });
  const [stats, setStats] = useState({
    totalReps: 0,
    correctReps: 0,
    wrongReps: 0,
    injuryAlerts: 0,
  });
  const [voiceEnabled] = useState(true);
  const [showSummary, setShowSummary] = useState(false);

  // MediaPipe state
  const [mediapipeActive, setMediapipeActive] = useState(true); // ON by default in full-screen
  const [mpStatus, setMpStatus] = useState("detecting");
  const [zoomLevel, setZoomLevel] = useState(1); // Zoom level for camera

  const wsRef = useRef(null);
  const API = "http://localhost:8000";

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startBackend = async () => {
    try {
      await fetch(`${API}/start`, { method: "POST" });
      setBackendRunning(true);
    } catch {
      console.error("Failed to start backend");
    }
  };

  const stopBackend = async () => {
    try {
      await fetch(`${API}/stop`, { method: "POST" });
      setBackendRunning(false);
    } catch {
      console.error("Failed to stop backend");
    }
  };

  const stopExercise = () => {
    setCameraActive(false);
    setMediapipeActive(false);
    setBackendRunning(false);
    setPosture(prev => ({
      ...prev,
      exercise: "Stopped",
      status: "wrong",
      issue: "Camera stopped",
    }));
  };

  const completeWorkout = async () => {
    stopBackend();
    setShowSummary(true);
  };

  const skipRest = async () => {
    try {
      await fetch(`${API}/skip-rest`, { method: "POST" });
    } catch {
      console.error("Failed to skip rest");
    }
  };

  // ── MediaPipe status callback ──
  const handleMediaPipeStatus = useCallback((status, issue, landmarks, detectedExercise) => {
    setMpStatus(status);
    setPosture(prev => ({
      ...prev,
      status: status === "detecting" ? "wrong" : status, // Default to wrong when detecting
      issue: issue || prev.issue,
      exercise: detectedExercise || (status === "detecting" ? "Detecting..." : selectedExercise?.name || prev.exercise),
    }));
  }, [selectedExercise]);

  // ── WebSocket (Python backend, only if backend running) ──
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    wsRef.current = new WebSocket("ws://localhost:8000/ws");
    wsRef.current.onopen = () => { console.log("WebSocket connected"); };
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPosture(prev => ({
        ...prev,
        ...data,
        voice_feedback: data.voice_feedback || null,
      }));
      setStats(prev => ({
        totalReps: data.rep_count || prev.totalReps,
        correctReps: data.status === "correct" ? prev.correctReps + 1 : prev.correctReps,
        wrongReps: data.status === "wrong" ? prev.wrongReps + 1 : prev.wrongReps,
        injuryAlerts: data.injury_warnings || prev.injuryAlerts,
      }));
    };
    wsRef.current.onerror  = () => { console.error("WebSocket error"); };
    wsRef.current.onclose  = () => { console.log("WebSocket closed"); };
  }, []);

  useEffect(() => {
    if (backendRunning) connectWebSocket();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [backendRunning, connectWebSocket]);

  // ── Voice feedback TTS ──
  useEffect(() => {
    if (voiceEnabled && posture.voice_feedback && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(posture.voice_feedback);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, [posture.voice_feedback, voiceEnabled]);

  // Effective status to display (MediaPipe takes priority when active)
  const displayStatus = mediapipeActive && mpStatus !== "detecting" ? mpStatus : posture.status;

  return (
    <div className="h-screen w-full bg-black flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-black/60 backdrop-blur-lg z-10">
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Exit</span>
        </button>

        <div className="text-center">
          <h2 className="text-white font-semibold text-lg">
            AI Trainer
          </h2>
        </div>

        <div>
          {/* Removed toggles */}
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        {/* Left Side - Camera Feed */}
        <div className="flex-1 relative bg-black rounded-2xl overflow-hidden" style={{ minHeight: "50vh" }}>
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
            <button
              onClick={() => setZoomLevel(Math.min(zoomLevel + 0.1, 2))}
              className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 transition-all flex items-center justify-center"
              title="Zoom In"
            >
              <span className="text-lg font-bold">+</span>
            </button>
            <button
              onClick={() => setZoomLevel(Math.max(zoomLevel - 0.1, 0.5))}
              className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 transition-all flex items-center justify-center"
              title="Zoom Out"
            >
              <span className="text-lg font-bold">−</span>
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 transition-all flex items-center justify-center text-xs"
              title="Reset Zoom"
            >
              1x
            </button>
          </div>

          {/* ── MediaPipe in-browser skeleton ── */}
          {mediapipeActive ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                transform: `scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: "transform 0.2s ease"
              }}
            >
              <MediaPipePoseOverlay
                exerciseName={selectedExercise?.name || posture.exercise || ""}
                onStatusChange={handleMediaPipeStatus}
                active={mediapipeActive}
              />
            </div>
          ) : (
            /* Python backend MJPEG feed */
            <img
              src={`${API}/video`}
              alt="Camera Feed"
              className="w-full h-full object-cover"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                transform: `scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: "transform 0.2s ease"
              }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentElement.insertAdjacentHTML("beforeend", `
                  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#94a3b8;z-index:2">
                    <div style="text-align:center">
                      <p style="font-size:18px;font-weight:600">Camera unavailable</p>
                      <p style="font-size:13px;opacity:0.6;margin-top:6px">Enable MediaPipe skeleton above</p>
                    </div>
                  </div>
                `);
              }}
            />
          )}

          {/* ── Voice Feedback Toast ── */}
          {voiceEnabled && posture.voice_feedback && (
            <div className="absolute top-4 left-4 z-30">
              <div className="bg-sky-600/80 backdrop-blur-lg px-4 py-2 rounded-xl text-white text-center">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4" />
                  <span className="font-medium text-sm">{posture.voice_feedback}</span>
                </div>
              </div>
            </div>
          )}

          {/* Camera stopped overlay */}
          {!cameraActive && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <p className="text-white text-xl font-semibold mb-2">Camera Stopped</p>
                <button
                  onClick={() => {
                    setCameraActive(true);
                    setMediapipeActive(true);
                  }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all"
                >
                  Resume Camera
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Exercise Detection Panel */}
        <div className="flex-1 bg-slate-900 rounded-2xl p-6 flex flex-col gap-4" style={{ minHeight: "50vh" }}>
          {/* Exercise Type Card */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-6 h-6 text-sky-400" />
              <h3 className="text-white font-semibold text-lg">Exercise Detected</h3>
            </div>
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-white mb-2">
                {posture.exercise || "Detecting..."}
              </p>
              <p className="text-slate-400 text-sm">
                {mpStatus === "detecting" ? "Analyzing your movement..." : "Exercise identified"}
              </p>
            </div>
          </div>

          {/* Form Status Card */}
          <div className={`rounded-2xl p-6 border-2 transition-all ${
            displayStatus === "correct"
              ? "bg-green-500/20 border-green-500"
              : displayStatus === "wrong"
              ? "bg-red-500/20 border-red-500"
              : "bg-slate-800 border-slate-700"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              {displayStatus === "correct" ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : displayStatus === "wrong" ? (
                <XCircle className="w-6 h-6 text-red-400" />
              ) : (
                <Activity className="w-6 h-6 text-slate-400" />
              )}
              <h3 className="font-semibold text-lg">
                {displayStatus === "correct" ? "Correct Form" : displayStatus === "wrong" ? "Incorrect Form" : "Detecting"}
              </h3>
            </div>
            <div className="text-center py-4">
              <p className={`text-4xl font-bold mb-2 ${
                displayStatus === "correct"
                  ? "text-green-400"
                  : displayStatus === "wrong"
                  ? "text-red-400"
                  : "text-slate-400"
              }`}>
                {displayStatus === "correct" ? "✓ CORRECT" : displayStatus === "wrong" ? "✗ WRONG" : "○ DETECTING"}
              </p>
              <p className="text-slate-300 text-sm">{posture.issue}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Rep Counter */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Reps</p>
              <p className="text-white text-4xl font-bold">{posture.rep_count}</p>
            </div>

            {/* Set Counter */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Set</p>
              <p className="text-white text-2xl font-bold">
                {posture.current_set}
              </p>
              <p className="text-slate-500 text-xs">{posture.set_reps}/{posture.target_reps}</p>
            </div>

            {/* Form Score */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Form</p>
              <p className="text-white text-3xl font-bold">{posture.form_score?.toFixed(0) || 0}</p>
            </div>
          </div>

          {/* Start/Complete/Stop Button */}
          <div className="mt-auto space-y-3">
            {!backendRunning ? (
              <button
                onClick={startBackend}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-lg"
              >
                <Play className="w-6 h-6" />
                <span className="text-lg">Start Workout</span>
              </button>
            ) : (
              <>
                <button
                  onClick={completeWorkout}
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-all shadow-lg"
                >
                  <CheckCircle className="w-6 h-6" />
                  <span className="text-lg">Complete Workout</span>
                </button>
                <button
                  onClick={stopExercise}
                  className="w-full flex items-center justify-center gap-3 px-8 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-all"
                >
                  <Square className="w-5 h-5" />
                  <span className="text-sm">Stop Exercise</span>
                </button>
              </>
            )}
          </div>

          {/* Rest Period */}
          {posture.in_rest && (
            <div className="bg-orange-500/20 backdrop-blur-lg rounded-2xl p-5 border border-orange-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-orange-400" />
                  <span className="text-white font-semibold text-lg">REST PERIOD</span>
                </div>
                <span className="text-white font-bold text-2xl">{formatTime(Math.floor(posture.rest_duration))}</span>
              </div>
              <button
                onClick={skipRest}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-all"
              >
                <SkipForward className="w-5 h-5" />
                Skip Rest
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Workout Summary Overlay */}
      {showSummary && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Workout Complete!</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-100 rounded-2xl p-4 text-center">
                <p className="text-gray-500 text-sm">Reps</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalReps}</p>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4 text-center">
                <p className="text-gray-500 text-sm">Accuracy</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalReps > 0 ? Math.round((stats.correctReps / stats.totalReps) * 100) : 0}%
                </p>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4 text-center">
                <p className="text-gray-500 text-sm">Form Score</p>
                <p className="text-3xl font-bold text-gray-900">{posture.form_score?.toFixed(0) || 0}</p>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4 text-center">
                <p className="text-gray-500 text-sm">Sets</p>
                <p className="text-3xl font-bold text-gray-900">{posture.current_set}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowSummary(false); onExit(); }}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all"
              >
                Return Home
              </button>
              <button
                onClick={() => { setShowSummary(false); onComplete(); }}
                className="flex-1 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold transition-all"
              >
                Save &amp; Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
