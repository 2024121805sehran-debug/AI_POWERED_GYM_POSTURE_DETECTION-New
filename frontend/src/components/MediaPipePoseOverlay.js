import React, { useEffect, useRef, useCallback, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// MediaPipe landmark indices
// ─────────────────────────────────────────────────────────────────────────────
const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,    RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
};

// ─────────────────────────────────────────────────────────────────────────────
// Angle helpers
// ─────────────────────────────────────────────────────────────────────────────
function angle3(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);
  if (magAB === 0 || magCB === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

function lm(landmarks, idx) {
  return landmarks[idx] || { x: 0, y: 0, z: 0, visibility: 0 };
}

function visible(landmarks, ...indices) {
  return indices.every((i) => (landmarks[i]?.visibility ?? 0) > 0.5);
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-detect exercise type based on pose
// ─────────────────────────────────────────────────────────────────────────────
function autoDetectExercise(landmarks) {
  if (!landmarks || landmarks.length === 0) {
    return null;
  }

  // Calculate key angles
  const leftElbowAngle = angle3(lm(landmarks, LM.LEFT_SHOULDER), lm(landmarks, LM.LEFT_ELBOW), lm(landmarks, LM.LEFT_WRIST));
  const rightElbowAngle = angle3(lm(landmarks, LM.RIGHT_SHOULDER), lm(landmarks, LM.RIGHT_ELBOW), lm(landmarks, LM.RIGHT_WRIST));
  const leftKneeAngle = angle3(lm(landmarks, LM.LEFT_HIP), lm(landmarks, LM.LEFT_KNEE), lm(landmarks, LM.LEFT_ANKLE));
  const rightKneeAngle = angle3(lm(landmarks, LM.RIGHT_HIP), lm(landmarks, LM.RIGHT_KNEE), lm(landmarks, LM.RIGHT_ANKLE));

  // Check wrist positions relative to shoulders
  const leftWristAbove = landmarks[LM.LEFT_WRIST]?.y < landmarks[LM.LEFT_SHOULDER]?.y;
  const rightWristAbove = landmarks[LM.RIGHT_WRIST]?.y < landmarks[LM.RIGHT_SHOULDER]?.y;
  const wristsOverhead = leftWristAbove || rightWristAbove;

  // Shoulder Press detection: arms overhead, elbows extended
  if (wristsOverhead && (leftElbowAngle > 130 || rightElbowAngle > 130)) {
    return "Shoulder Press";
  }

  // Bicep Curl detection: elbows at sides, wrists near shoulders but not overhead
  if (!wristsOverhead && (leftElbowAngle < 120 || rightElbowAngle < 120)) {
    return "Bicep Curl";
  }

  // Squat detection: knees bent
  if (leftKneeAngle < 140 || rightKneeAngle < 140) {
    return "Squat";
  }

  // Push-up detection: body horizontal, elbows bent
  const bodyHorizontal = Math.abs(landmarks[LM.LEFT_SHOULDER]?.y - landmarks[LM.LEFT_HIP]?.y) < 0.15;
  if (bodyHorizontal && (leftElbowAngle < 110 || rightElbowAngle < 110)) {
    return "Push-up";
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise detection rules
// ─────────────────────────────────────────────────────────────────────────────
function detectExercise(exerciseName, landmarks) {
  if (!landmarks || landmarks.length === 0) {
    return { status: "detecting", issue: "No pose detected" };
  }

  // Auto-detect exercise if no name provided
  const detectedExercise = autoDetectExercise(landmarks);
  const name = ((exerciseName || detectedExercise || "")).toLowerCase();

  // Bicep Curl
  if (name.includes("bicep") || name.includes("curl")) {
    const useLeft =
      (landmarks[LM.LEFT_ELBOW]?.visibility ?? 0) >=
      (landmarks[LM.RIGHT_ELBOW]?.visibility ?? 0);
    if (!visible(landmarks,
      useLeft ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER,
      useLeft ? LM.LEFT_ELBOW   : LM.RIGHT_ELBOW,
      useLeft ? LM.LEFT_WRIST   : LM.RIGHT_WRIST
    )) {
      return { status: "detecting", issue: "Show your arm to camera" };
    }
    const shoulder = lm(landmarks, useLeft ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER);
    const elbow    = lm(landmarks, useLeft ? LM.LEFT_ELBOW    : LM.RIGHT_ELBOW);
    const wrist    = lm(landmarks, useLeft ? LM.LEFT_WRIST    : LM.RIGHT_WRIST);
    const a = angle3(shoulder, elbow, wrist);
    if (a < 70 || a > 155) return { status: "correct", issue: `Elbow angle: ${a.toFixed(0)}\xb0` };
    return { status: "wrong", issue: `Incomplete curl \u2014 elbow: ${a.toFixed(0)}\xb0` };
  }

  // Squat
  if (name.includes("squat")) {
    if (!visible(landmarks, LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE))
      return { status: "detecting", issue: "Show lower body to camera" };
    const a = angle3(lm(landmarks, LM.LEFT_HIP), lm(landmarks, LM.LEFT_KNEE), lm(landmarks, LM.LEFT_ANKLE));
    if (a < 100 || a > 160) return { status: "correct", issue: `Knee: ${a.toFixed(0)}\xb0` };
    return { status: "wrong", issue: `Squat deeper \u2014 knee: ${a.toFixed(0)}\xb0` };
  }

  // Push-up
  if (name.includes("push")) {
    if (!visible(landmarks, LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST))
      return { status: "detecting", issue: "Show upper body to camera" };
    const a = angle3(lm(landmarks, LM.LEFT_SHOULDER), lm(landmarks, LM.LEFT_ELBOW), lm(landmarks, LM.LEFT_WRIST));
    if (a < 100 || a > 155) return { status: "correct", issue: `Elbow: ${a.toFixed(0)}\xb0` };
    return { status: "wrong", issue: `Go lower \u2014 elbow: ${a.toFixed(0)}\xb0` };
  }

  // Shoulder Press / Overhead Press - IMPROVED AUTO DETECTION
  if (name.includes("press") || name.includes("overhead") || name.includes("shoulder")) {
    if (!visible(landmarks, LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST) &&
        !visible(landmarks, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST))
      return { status: "detecting", issue: "Show arms to camera" };

    // Check both arms
    const leftElbowAngle = angle3(lm(landmarks, LM.LEFT_SHOULDER), lm(landmarks, LM.LEFT_ELBOW), lm(landmarks, LM.LEFT_WRIST));
    const rightElbowAngle = angle3(lm(landmarks, LM.RIGHT_SHOULDER), lm(landmarks, LM.RIGHT_ELBOW), lm(landmarks, LM.RIGHT_WRIST));

    // Use the most visible arm
    const leftVis = landmarks[LM.LEFT_ELBOW]?.visibility ?? 0;
    const rightVis = landmarks[LM.RIGHT_ELBOW]?.visibility ?? 0;
    const elbowAngle = leftVis >= rightVis ? leftElbowAngle : rightElbowAngle;

    // Check if wrists are above shoulders (overhead position)
    const leftWristAbove = landmarks[LM.LEFT_WRIST]?.y < landmarks[LM.LEFT_SHOULDER]?.y;
    const rightWristAbove = landmarks[LM.RIGHT_WRIST]?.y < landmarks[LM.RIGHT_SHOULDER]?.y;
    const wristsOverhead = (leftVis > 0.5 && leftWristAbove) || (rightVis > 0.5 && rightWristAbove);

    // Correct form: arms extended overhead (elbow angle > 150) OR partial press (90-150)
    if (elbowAngle > 155 && wristsOverhead) {
      return { status: "correct", issue: `Full overhead press \u2014 elbow: ${elbowAngle.toFixed(0)}\xb0` };
    } else if (elbowAngle > 130 && wristsOverhead) {
      return { status: "correct", issue: `Good press \u2014 elbow: ${elbowAngle.toFixed(0)}\xb0` };
    } else if (elbowAngle < 70) {
      return { status: "wrong", issue: `Press higher \u2014 elbow: ${elbowAngle.toFixed(0)}\xb0` };
    } else if (!wristsOverhead) {
      return { status: "wrong", issue: `Raise arms overhead \u2014 not high enough` };
    }
    return { status: "wrong", issue: `Extend arms \u2014 ${elbowAngle.toFixed(0)}\xb0` };
  }

  // Lateral Raise
  if (name.includes("lateral") || name.includes("raise")) {
    if (!visible(landmarks, LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_HIP))
      return { status: "detecting", issue: "Show upper body to camera" };
    const a = angle3(lm(landmarks, LM.LEFT_HIP), lm(landmarks, LM.LEFT_SHOULDER), lm(landmarks, LM.LEFT_ELBOW));
    if (a > 70) return { status: "correct", issue: `Arms raised \u2014 ${a.toFixed(0)}\xb0` };
    return { status: "wrong", issue: `Raise arms higher \u2014 ${a.toFixed(0)}\xb0` };
  }

  // Lunge
  if (name.includes("lunge")) {
    if (!visible(landmarks, LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE))
      return { status: "detecting", issue: "Show lower body to camera" };
    const a = angle3(lm(landmarks, LM.LEFT_HIP), lm(landmarks, LM.LEFT_KNEE), lm(landmarks, LM.LEFT_ANKLE));
    if (a < 100) return { status: "correct", issue: `Deep lunge \u2014 ${a.toFixed(0)}\xb0` };
    return { status: "wrong", issue: `Lunge deeper \u2014 ${a.toFixed(0)}\xb0` };
  }

  // Deadlift
  if (name.includes("deadlift")) {
    if (!visible(landmarks, LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_SHOULDER))
      return { status: "detecting", issue: "Show full body to camera" };
    const a = angle3(lm(landmarks, LM.LEFT_SHOULDER), lm(landmarks, LM.LEFT_HIP), lm(landmarks, LM.LEFT_KNEE));
    if (a > 150 || a < 80) return { status: "correct", issue: `Hip: ${a.toFixed(0)}\xb0` };
    return { status: "wrong", issue: `Keep back straight \u2014 ${a.toFixed(0)}\xb0` };
  }

  // Plank
  if (name.includes("plank")) {
    if (!visible(landmarks, LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_ANKLE))
      return { status: "detecting", issue: "Show full body to camera" };
    const a = angle3(lm(landmarks, LM.LEFT_SHOULDER), lm(landmarks, LM.LEFT_HIP), lm(landmarks, LM.LEFT_ANKLE));
    if (a > 155) return { status: "correct", issue: `Body aligned \u2014 ${a.toFixed(0)}\xb0` };
    return { status: "wrong", issue: `Straighten hips \u2014 ${a.toFixed(0)}\xb0` };
  }

  // Sit-up / Crunch
  if (name.includes("sit") || name.includes("crunch") || name.includes("ab")) {
    if (!visible(landmarks, LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE))
      return { status: "detecting", issue: "Show upper body to camera" };
    const a = angle3(lm(landmarks, LM.LEFT_SHOULDER), lm(landmarks, LM.LEFT_HIP), lm(landmarks, LM.LEFT_KNEE));
    if (a < 70 || a > 150) return { status: "correct", issue: `Torso: ${a.toFixed(0)}\xb0` };
    return { status: "wrong", issue: `Crunch higher \u2014 ${a.toFixed(0)}\xb0` };
  }

  // Tricep Extension / Dip
  if (name.includes("tricep") || name.includes("dip") || name.includes("extension")) {
    if (!visible(landmarks, LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST))
      return { status: "detecting", issue: "Show arm to camera" };
    const a = angle3(lm(landmarks, LM.LEFT_SHOULDER), lm(landmarks, LM.LEFT_ELBOW), lm(landmarks, LM.LEFT_WRIST));
    if (a > 155 || a < 75) return { status: "correct", issue: `Elbow: ${a.toFixed(0)}\xb0` };
    return { status: "wrong", issue: `Full extension needed \u2014 ${a.toFixed(0)}\xb0` };
  }

  // Row
  if (name.includes("row")) {
    if (!visible(landmarks, LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST))
      return { status: "detecting", issue: "Show upper body to camera" };
    const a = angle3(lm(landmarks, LM.LEFT_SHOULDER), lm(landmarks, LM.LEFT_ELBOW), lm(landmarks, LM.LEFT_WRIST));
    if (a < 80 || a > 155) return { status: "correct", issue: `Elbow: ${a.toFixed(0)}\xb0` };
    return { status: "wrong", issue: `Pull further \u2014 ${a.toFixed(0)}\xb0` };
  }

  // Generic fallback - default to wrong until correct form detected
  const anyVisible = landmarks.some((l) => (l?.visibility ?? 0) > 0.5);
  if (!anyVisible) return { status: "detecting", issue: "No pose detected" };
  return { status: "wrong", issue: "Perform the exercise to check form" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton drawing
// ─────────────────────────────────────────────────────────────────────────────
const POSE_CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [11,23],[12,24],[23,24],
  [23,25],[25,27],[24,26],[26,28],
  [0,11],[0,12],
];

function drawSkeleton(ctx, landmarks, W, H, status) {
  if (!landmarks || landmarks.length === 0) return;
  const lineCol = status === "correct" ? "#22c55e" : status === "wrong" ? "#ef4444" : "#94a3b8";
  const dotCol  = status === "correct" ? "#86efac" : status === "wrong" ? "#fca5a5" : "#cbd5e1";

  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.88;

  POSE_CONNECTIONS.forEach(([a, b]) => {
    const pa = landmarks[a], pb = landmarks[b];
    if (!pa || !pb) return;
    if ((pa.visibility ?? 0) < 0.3 || (pb.visibility ?? 0) < 0.3) return;
    ctx.beginPath();
    ctx.strokeStyle = lineCol;
    ctx.moveTo(pa.x * W, pa.y * H);
    ctx.lineTo(pb.x * W, pb.y * H);
    ctx.stroke();
  });

  landmarks.forEach((l, idx) => {
    if (!l || (l.visibility ?? 0) < 0.3) return;
    ctx.beginPath();
    ctx.arc(l.x * W, l.y * H, idx === LM.NOSE ? 6 : 5, 0, Math.PI * 2);
    ctx.fillStyle   = dotCol;
    ctx.globalAlpha = 0.95;
    ctx.fill();
    ctx.strokeStyle = lineCol;
    ctx.lineWidth   = 2;
    ctx.stroke();
  });

  ctx.globalAlpha = 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

// Global safeguard against MediaPipe packed assets loader race conditions in React StrictMode
if (typeof window !== "undefined") {
  window.createMediapipeSolutionsPackedAssets = window.createMediapipeSolutionsPackedAssets || {};
  if (!window.createMediapipeSolutionsPackedAssets.dataFileDownloads) {
    try {
      window.createMediapipeSolutionsPackedAssets.dataFileDownloads = new Proxy({}, {
        get: (target, prop) => {
          if (!(prop in target)) {
            target[prop] = { loaded: 0, total: 1 };
          }
          return target[prop];
        }
      });
    } catch (_) {
      window.createMediapipeSolutionsPackedAssets.dataFileDownloads = {};
    }
  }
}

export default function MediaPipePoseOverlay({ exerciseName = "", onStatusChange, active = true }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const poseRef   = useRef(null);
  const camRef    = useRef(null);
  const isPoseReadyRef = useRef(false);

  const exerciseNameRef = useRef(exerciseName);
  exerciseNameRef.current = exerciseName;

  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const [poseLoaded, setPoseLoaded] = useState(false);
  const [camError,   setCamError]   = useState(null);
  const [status,     setStatus]     = useState("detecting");
  const [issue,      setIssue]      = useState("Loading MediaPipe…");
  const [fps,        setFps]        = useState(0);

  const lastFpsTime = useRef(Date.now());
  const frameCount  = useRef(0);

  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W   = canvas.width;
    const H   = canvas.height;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, -W, 0, W, H);
    ctx.restore();

    const landmarks = results.poseLandmarks;

    // Auto-detect exercise first
    const detectedExercise = autoDetectExercise(landmarks);

    // Use detected exercise for validation
    const det = detectExercise(detectedExercise || exerciseNameRef.current, landmarks);
    setStatus(det.status);
    setIssue(det.issue);

    // Pass detected exercise name back to parent
    if (onStatusChangeRef.current) {
      onStatusChangeRef.current(det.status, det.issue, landmarks, detectedExercise);
    }

    if (landmarks) {
      const mirrored = landmarks.map((l) => ({ ...l, x: 1 - l.x }));
      drawSkeleton(ctx, mirrored, W, H, det.status);
    }

    frameCount.current += 1;
    const now = Date.now();
    if (now - lastFpsTime.current >= 1000) {
      setFps(frameCount.current);
      frameCount.current  = 0;
      lastFpsTime.current = now;
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement("script");
        s.src = src;
        s.crossOrigin = "anonymous";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });

    async function init() {
      try {
        // Request camera permission first
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          if (!cancelled) {
            setCamError("Camera permission denied. Please allow camera access and refresh.");
            setIssue("Camera access required");
          }
          return;
        }

        // Ensure global dataFileDownloads proxy exists before scripts execute
        window.createMediapipeSolutionsPackedAssets = window.createMediapipeSolutionsPackedAssets || {};
        if (!window.createMediapipeSolutionsPackedAssets.dataFileDownloads) {
          try {
            window.createMediapipeSolutionsPackedAssets.dataFileDownloads = new Proxy({}, {
              get: (target, prop) => {
                if (!(prop in target)) {
                  target[prop] = { loaded: 0, total: 1 };
                }
                return target[prop];
              }
            });
          } catch (_) {
            window.createMediapipeSolutionsPackedAssets.dataFileDownloads = {};
          }
        }

        // Load MediaPipe scripts from CDN with pinned compatible versions
        const POSE_VERSION = "0.5.1675469404";
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");
        await loadScript(`https://cdn.jsdelivr.net/npm/@mediapipe/pose@${POSE_VERSION}/pose.js`);
        if (cancelled) return;

        // Use window.Pose from CDN
        const Pose = window.Pose;
        const Camera = window.Camera;

        if (!Pose || !Camera) {
          throw new Error("Failed to load Pose/Camera from CDN");
        }

        const pose = new Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${POSE_VERSION}/${file}`,
        });
        pose.setOptions({
          modelComplexity: 0,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        pose.onResults(onResults);
        poseRef.current = pose;

        // Initialize pose WASM and binary assets before pumping video frames
        if (typeof pose.initialize === "function") {
          await pose.initialize();
        }
        if (cancelled) return;
        isPoseReadyRef.current = true;

        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (poseRef.current && isPoseReadyRef.current && videoRef.current) {
              try {
                await poseRef.current.send({ image: videoRef.current });
              } catch (e) {
                console.warn("Frame send error:", e);
              }
            }
          },
          width: 640, height: 480,
        });
        await camera.start();
        camRef.current = camera;
        if (!cancelled) { setPoseLoaded(true); setIssue("Detecting pose…"); }
      } catch (err) {
        if (!cancelled) {
          console.error("MediaPipe init error:", err);
          setCamError(err.message || "Failed to load MediaPipe. Please check your internet connection.");
          setIssue("Error loading pose engine");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      isPoseReadyRef.current = false;
      try { camRef.current?.stop(); } catch (_) {}
      try { poseRef.current?.close(); } catch (_) {}
      camRef.current = null;
      poseRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const borderColor =
    status === "correct" ? "#22c55e" :
    status === "wrong"   ? "#ef4444" : "#475569";

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      borderRadius: "16px", overflow: "hidden", background: "#0f172a",
      border: `2px solid ${borderColor}`,
      transition: "border-color 0.3s ease, box-shadow 0.3s ease",
      boxShadow: `0 0 24px ${borderColor}44`,
    }}>
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />
      <canvas ref={canvasRef} width={640} height={480}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
      />

      {/* Loading */}
      {!poseLoaded && !camError && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "rgba(15,23,42,0.88)", color: "#94a3b8", gap: "12px", zIndex: 10,
        }}>
          <div className="mp-spinner" />
          <p style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Loading MediaPipe Pose…</p>
          <p style={{ fontSize: "12px", opacity: 0.6, margin: 0 }}>Accessing webcam & loading AI model</p>
        </div>
      )}

      {/* Error */}
      {camError && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "rgba(15,23,42,0.92)", color: "#f87171", gap: "8px",
          padding: "24px", textAlign: "center", zIndex: 10,
        }}>
          <span style={{ fontSize: "32px" }}>📷</span>
          <p style={{ fontWeight: 700, margin: 0 }}>Camera / MediaPipe Error</p>
          <p style={{ fontSize: "12px", opacity: 0.8, margin: 0 }}>{camError}</p>
          <p style={{ fontSize: "11px", opacity: 0.5, margin: 0 }}>Allow camera access and reload the page.</p>
        </div>
      )}

      {/* Status badge */}
      <div style={{
        position: "absolute", top: "16px", left: "50%", transform: "translateX(-50%)",
        zIndex: 20, display: "flex", alignItems: "center", gap: "8px",
        padding: "8px 20px", borderRadius: "999px",
        background: status === "correct" ? "rgba(34,197,94,0.25)"
                  : status === "wrong"   ? "rgba(239,68,68,0.25)"
                  : "rgba(71,85,105,0.4)",
        border: `2px solid ${borderColor}`,
        backdropFilter: "blur(12px)", transition: "all 0.25s ease", whiteSpace: "nowrap",
      }}>
        <span style={{ fontSize: "18px" }}>
          {status === "correct" ? "\u2705" : status === "wrong" ? "\u274c" : "\uD83D\uDD0D"}
        </span>
        <span style={{
          color: status === "correct" ? "#86efac" : status === "wrong" ? "#fca5a5" : "#94a3b8",
          fontWeight: 800, fontSize: "15px", letterSpacing: "1px", textTransform: "uppercase",
        }}>
          {status === "correct" ? "CORRECT" : status === "wrong" ? "WRONG" : "DETECTING"}
        </span>
      </div>

      {/* Issue text */}
      <div style={{
        position: "absolute", bottom: "12px", left: "12px", zIndex: 20,
        background: "rgba(15,23,42,0.75)", backdropFilter: "blur(8px)",
        borderRadius: "8px", padding: "4px 10px",
        color: "#cbd5e1", fontSize: "11px", maxWidth: "calc(100% - 80px)",
      }}>
        {issue}
      </div>

      {/* FPS */}
      {poseLoaded && (
        <div style={{
          position: "absolute", bottom: "12px", right: "12px", zIndex: 20,
          background: "rgba(15,23,42,0.75)", backdropFilter: "blur(8px)",
          borderRadius: "6px", padding: "3px 8px",
          color: "#475569", fontSize: "10px", fontFamily: "monospace",
        }}>
          {fps} FPS · MediaPipe
        </div>
      )}

      <style>{`
        .mp-spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(148,163,184,0.2);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: mp-spin 0.9s linear infinite;
        }
        @keyframes mp-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
