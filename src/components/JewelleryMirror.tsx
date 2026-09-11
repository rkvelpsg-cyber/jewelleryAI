"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Camera, CameraOff, RefreshCw } from "lucide-react";
import type { ARTransform, JewelleryProduct } from "@/types";
import ThreeJewelleryLayer from "./ThreeJewelleryLayer";

interface Props {
  product: JewelleryProduct;
  onSnapshot?: (dataUrl: string) => void;
}

type NormalizedLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
};

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

const initialTransform: ARTransform = {
  visible: false,
  x: 0.5,
  y: 0.5,
  scale: 0.25,
  rotationZ: 0,
  yaw: 0,
  pitch: 0,
};

function smooth(oldValue: number, newValue: number, factor = 0.22) {
  return oldValue * (1 - factor) + newValue * factor;
}

function dist(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function JewelleryMirror({ product, onSnapshot }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const smoothRef = useRef<ARTransform>(initialTransform);
  const [transform, setTransform] = useState<ARTransform>(initialTransform);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Starting camera…");

  const is3D = product.renderMode === "3d" && Boolean(product.model3dUrl);

  const stopAll = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
  }, []);

  const draw2D = useCallback(
    (landmarks: NormalizedLandmark[]) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const img = imageRef.current;
      if (!video || !canvas || !img || !img.complete) return;

      const rect = video.getBoundingClientRect();
      if (
        canvas.width !== Math.round(rect.width) ||
        canvas.height !== Math.round(rect.height)
      ) {
        canvas.width = Math.round(rect.width);
        canvas.height = Math.round(rect.height);
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // MediaPipe is computed on the unmirrored video. The UI mirrors the video,
      // so x is flipped when drawing overlays.
      const leftSide = landmarks[127];
      const rightSide = landmarks[356];
      const chin = landmarks[152];
      const nose = landmarks[1];
      const forehead = landmarks[10];
      if (!leftSide || !rightSide || !chin || !nose || !forehead) return;

      const faceWidth = dist(leftSide, rightSide);
      const faceAngle = Math.atan2(
        rightSide.y - leftSide.y,
        rightSide.x - leftSide.x,
      );
      const centerX = (leftSide.x + rightSide.x) / 2;
      const centerY = (leftSide.y + rightSide.y) / 2;
      const faceHeight = dist(forehead, chin);
      const yaw = (nose.x - centerX) / Math.max(faceWidth, 0.001);
      const pitch = (nose.y - centerY) / Math.max(faceHeight, 0.001);

      let target: ARTransform;

      if (product.type === "earrings") {
        target = {
          visible: true,
          x: centerX + product.offsetX * faceWidth,
          y: centerY + product.offsetY * faceHeight,
          scale: faceWidth * product.scaleMultiplier,
          rotationZ: faceAngle,
          yaw,
          pitch,
        };

        const earringW = canvas.width * target.scale;
        const earringH = earringW * 1.55;
        const leftX =
          (1 - rightSide.x) * canvas.width + product.offsetX * canvas.width;
        const rightX =
          (1 - leftSide.x) * canvas.width - product.offsetX * canvas.width;
        const earY =
          ((leftSide.y + rightSide.y) / 2 + 0.09 + product.offsetY * 0.2) *
          canvas.height;

        ctx.save();
        ctx.globalAlpha = 0.98;
        ctx.translate(leftX, earY);
        ctx.rotate(-faceAngle);
        ctx.drawImage(img, -earringW / 2, -earringH * 0.15, earringW, earringH);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.98;
        ctx.translate(rightX, earY);
        ctx.rotate(-faceAngle);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -earringW / 2, -earringH * 0.15, earringW, earringH);
        ctx.restore();
      } else {
        target = {
          visible: true,
          x: centerX + product.offsetX * faceWidth,
          y: chin.y + product.offsetY * faceHeight,
          scale: faceWidth * product.scaleMultiplier,
          rotationZ: faceAngle,
          yaw,
          pitch,
        };

        const previous = smoothRef.current;
        const smoothed = {
          visible: true,
          x: smooth(previous.x, target.x),
          y: smooth(previous.y, target.y),
          scale: smooth(previous.scale, target.scale),
          rotationZ: smooth(previous.rotationZ, target.rotationZ),
          yaw: smooth(previous.yaw, target.yaw),
          pitch: smooth(previous.pitch, target.pitch),
        };
        smoothRef.current = smoothed;
        setTransform(smoothed);

        const w = canvas.width * smoothed.scale;
        const aspect = img.naturalHeight / Math.max(img.naturalWidth, 1);
        const h = w * aspect;
        const x = (1 - smoothed.x) * canvas.width;
        const y = smoothed.y * canvas.height;

        ctx.save();
        ctx.globalAlpha = 0.98;
        ctx.translate(x, y);
        ctx.rotate(-smoothed.rotationZ);
        // Small horizontal perspective cue based on head yaw.
        ctx.scale(Math.max(0.72, 1 - Math.abs(smoothed.yaw) * 0.6), 1);
        ctx.drawImage(img, -w / 2, -h * 0.18, w, h);
        ctx.restore();
      }
    },
    [product],
  );

  const updateTransformOnly = useCallback(
    (landmarks: NormalizedLandmark[]) => {
      const leftSide = landmarks[127];
      const rightSide = landmarks[356];
      const chin = landmarks[152];
      const nose = landmarks[1];
      const forehead = landmarks[10];
      if (!leftSide || !rightSide || !chin || !nose || !forehead) return;

      const faceWidth = dist(leftSide, rightSide);
      const faceHeight = dist(forehead, chin);
      const centerX = (leftSide.x + rightSide.x) / 2;
      const centerY = (leftSide.y + rightSide.y) / 2;
      const target: ARTransform = {
        visible: true,
        x: 1 - (centerX + product.offsetX * faceWidth),
        y: chin.y + product.offsetY * faceHeight,
        scale: faceWidth * product.scaleMultiplier,
        rotationZ: -Math.atan2(
          rightSide.y - leftSide.y,
          rightSide.x - leftSide.x,
        ),
        yaw: (nose.x - centerX) / Math.max(faceWidth, 0.001),
        pitch: (nose.y - centerY) / Math.max(faceHeight, 0.001),
      };
      const p = smoothRef.current;
      const s = {
        visible: true,
        x: smooth(p.x, target.x),
        y: smooth(p.y, target.y),
        scale: smooth(p.scale, target.scale),
        rotationZ: smooth(p.rotationZ, target.rotationZ),
        yaw: smooth(p.yaw, target.yaw),
        pitch: smooth(p.pitch, target.pitch),
      };
      smoothRef.current = s;
      setTransform(s);
    },
    [product],
  );

  const start = useCallback(async () => {
    stopAll();
    setStatus("loading");
    setMessage("Starting camera and face tracking…");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException(
          "Webcam access is not supported in this browser.",
          "NotSupportedError",
        );
      }

      const devices = await navigator.mediaDevices
        .enumerateDevices()
        .catch(() => []);
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );
      const preferredDevice =
        videoDevices.find((device) => /front|user|face/i.test(device.label)) ??
        videoDevices[0];

      if (!preferredDevice && videoDevices.length === 0) {
        throw new DOMException(
          "No camera devices were found on this machine.",
          "NotFoundError",
        );
      }

      const constraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };

      if (preferredDevice) {
        constraints.deviceId = { exact: preferredDevice.deviceId };
      } else {
        constraints.facingMode = "user";
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: constraints,
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      let landmarker: FaceLandmarker;
      try {
        landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFacialTransformationMatrixes: true,
        });
      } catch {
        // Some mini-PC/browser combinations do not support the GPU delegate.
        landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFacialTransformationMatrixes: true,
        });
      }
      landmarkerRef.current = landmarker;
      setStatus("ready");
      setMessage("Move naturally — the jewellery will follow you.");

      const loop = () => {
        const video = videoRef.current;
        const tracker = landmarkerRef.current;
        const canvas = canvasRef.current;
        if (!video || !tracker || video.readyState < 2) {
          frameRef.current = requestAnimationFrame(loop);
          return;
        }
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          const result = tracker.detectForVideo(video, performance.now());
          const landmarks = result.faceLandmarks?.[0];
          if (landmarks) {
            if (is3D) updateTransformOnly(landmarks);
            else draw2D(landmarks);
          } else {
            if (canvas)
              canvas
                .getContext("2d")
                ?.clearRect(0, 0, canvas.width, canvas.height);
            setTransform((t) => ({ ...t, visible: false }));
          }
        }
        frameRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (error) {
      console.error(error);
      let friendlyMessage =
        "Camera or face tracking could not start. Check camera permission and internet connection.";

      if (error instanceof DOMException) {
        if (error.name === "NotFoundError") {
          friendlyMessage =
            "No camera was detected on this device. Please connect a webcam or use a different machine.";
        } else if (error.name === "NotAllowedError") {
          friendlyMessage =
            "Camera access was blocked. Please allow webcam access and refresh the page.";
        } else if (error.name === "NotSupportedError") {
          friendlyMessage =
            "This browser does not support webcam access. Try Chrome or Edge.";
        }
      }

      setStatus("error");
      setMessage(friendlyMessage);
    }
  }, [draw2D, is3D, stopAll, updateTransformOnly]);

  useEffect(() => {
    const img = new Image();
    img.src = product.imageUrl;
    imageRef.current = img;
    smoothRef.current = initialTransform;
  }, [product]);

  useEffect(() => {
    start();
    return stopAll;
  }, [start, stopAll]);

  const capture = () => {
    const video = videoRef.current;
    const overlay = canvasRef.current;
    if (!video || !overlay) return;
    const rect = video.getBoundingClientRect();
    const out = document.createElement("canvas");
    out.width = Math.round(rect.width * 1.5);
    out.height = Math.round(rect.height * 1.5);
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.translate(out.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, out.width, out.height);
    ctx.restore();
    if (!is3D) ctx.drawImage(overlay, 0, 0, out.width, out.height);
    const dataUrl = out.toDataURL("image/jpeg", 0.9);
    onSnapshot?.(dataUrl);
  };

  const statusClass = useMemo(() => `mirrorStatus ${status}`, [status]);

  return (
    <div className="mirrorShell">
      <div className="mirrorStage">
        <video ref={videoRef} className="mirrorVideo" playsInline muted />
        <canvas ref={canvasRef} className="mirrorCanvas" />
        {is3D && (
          <ThreeJewelleryLayer product={product} transform={transform} />
        )}
        <div className="cameraGuide" aria-hidden="true" />
        <div className={statusClass}>
          {status === "ready" ? (
            <Camera size={17} />
          ) : status === "error" ? (
            <CameraOff size={17} />
          ) : (
            <RefreshCw size={17} className="spin" />
          )}
          <span>{message}</span>
        </div>
      </div>
      <div className="mirrorActions">
        <button className="secondaryButton" onClick={start}>
          <RefreshCw size={19} /> Restart Camera
        </button>
        <button
          className="primaryButton"
          onClick={capture}
          disabled={status !== "ready"}
        >
          <Camera size={19} /> Save This Look
        </button>
      </div>
    </div>
  );
}
