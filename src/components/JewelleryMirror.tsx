"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import { Camera, CameraOff, RefreshCw } from "lucide-react";
import type {
  ARTransform,
  JewelleryProduct,
  JewelleryTransforms,
} from "@/types";
import {
  computeJewelleryTransforms,
  type Transform2D,
} from "@/lib/vision/jewelleryPositioning";
import {
  mapNormalizedToCanvas,
  MIRROR_CAMERA,
} from "@/lib/vision/coordinateMapping";
import { getCachedImage, preloadImages } from "@/lib/vision/assetCache";
import { getHandInfo } from "@/lib/vision/handTracking";
import {
  calculateBangleTransform,
  calculateRingTransform,
} from "@/lib/vision/handPositioning";
import ThreeJewelleryLayer from "./ThreeJewelleryLayer";
import JewelleryCalibrationPanel from "./JewelleryCalibrationPanel";
import { kioskCalibration } from "@/lib/config/kiosk";

interface Props {
  product: JewelleryProduct;
  onSnapshot?: (dataUrl: string) => void;
}

const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker_lite/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
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

async function requestCameraStream() {
  const preferredConstraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: "user" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    },
  };

  try {
    return await navigator.mediaDevices.getUserMedia(preferredConstraints);
  } catch (firstError) {
    // Mobile browsers frequently reject ideal facingMode/resolution combinations.
    // Retry with the browser's default camera instead of treating that as no camera.
    if (
      firstError instanceof DOMException &&
      firstError.name === "NotAllowedError"
    ) {
      throw firstError;
    }
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function smooth(oldValue: number, newValue: number, factor = 0.22) {
  return oldValue * (1 - factor) + newValue * factor;
}

function getDefaultCalibration(
  product: JewelleryProduct,
): Partial<JewelleryProduct> {
  if (product.type === "earrings") {
    return {
      earringScaleMultiplier: product.earringScaleMultiplier ?? 0.16,
      leftOffsetX: product.leftOffsetX ?? -0.02,
      leftOffsetY: product.leftOffsetY ?? 0.04,
      rightOffsetX: product.rightOffsetX ?? 0.02,
      rightOffsetY: product.rightOffsetY ?? 0.04,
      yawScaleStrength: product.yawScaleStrength ?? 0.2,
      yawOpacityStrength: product.yawOpacityStrength ?? 0.5,
    };
  }

  return {
    scaleMultiplier: product.scaleMultiplier ?? 1.05,
    offsetX: product.offsetX ?? 0,
    offsetY: product.offsetY ?? 0,
    verticalAnchorRatio: product.verticalAnchorRatio ?? 0.48,
    rotationOffset: product.rotationOffset ?? 0,
  };
}

export default function JewelleryMirror({ product, onSnapshot }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const leftImageRef = useRef<HTMLImageElement | null>(null);
  const rightImageRef = useRef<HTMLImageElement | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const renderLoopRef = useRef<() => void>(() => undefined);
  const smoothRef = useRef<ARTransform>(initialTransform);
  const previousTransformsRef = useRef<JewelleryTransforms>({});
  const trackingLostAtRef = useRef<number | null>(null);
  const productRef = useRef(product);
  const productConfigRef = useRef(product);

  const [transform, setTransform] = useState<ARTransform>(initialTransform);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Starting camera…");
  const [showDebug, setShowDebug] = useState(false);
  const [calibration, setCalibration] = useState<Partial<JewelleryProduct>>(
    () => getDefaultCalibration(product),
  );

  const is3D = product.renderMode === "3d" && Boolean(product.model3dUrl);
  const handMode =
    product.type === "bangles" ||
    product.type === "bracelet" ||
    product.type === "rings";
  const guidance = handMode
    ? product.type === "rings"
      ? "Bring your hand slightly closer and keep your fingers relaxed."
      : "Hold your wrist comfortably in front of the camera."
    : "Stand comfortably facing the mirror.";
  const productConfig = useMemo(
    () => ({ ...product, ...calibration }),
    [product, calibration],
  );

  useEffect(() => {
    productRef.current = product;
    // Product changes reset calibration for the newly selected SKU.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCalibration(getDefaultCalibration(product));
    previousTransformsRef.current = {};
    smoothRef.current = initialTransform;
  }, [product]);

  useEffect(() => {
    productConfigRef.current = productConfig;
  }, [productConfig]);

  useEffect(() => {
    const urls = [
      product.imageUrl,
      product.leftImageUrl,
      product.rightImageUrl,
    ];
    void preloadImages(urls).then(() => {
      imageRef.current = getCachedImage(product.imageUrl);
      leftImageRef.current =
        getCachedImage(product.leftImageUrl) ?? imageRef.current;
      rightImageRef.current =
        getCachedImage(product.rightImageUrl) ?? imageRef.current;
    });
  }, [product.imageUrl, product.leftImageUrl, product.rightImageUrl]);

  const stopAll = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    faceLandmarkerRef.current?.close();
    faceLandmarkerRef.current = null;
    poseLandmarkerRef.current?.close();
    poseLandmarkerRef.current = null;
    handLandmarkerRef.current?.close();
    handLandmarkerRef.current = null;
  }, []);

  const updateCalibration = useCallback(
    (key: keyof JewelleryProduct, value: number) => {
      setCalibration((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const resetCalibration = useCallback(() => {
    setCalibration(getDefaultCalibration(product));
  }, [product]);

  const drawJewelleryImage = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      img: HTMLImageElement,
      item: Transform2D,
      flip = false,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const width = canvas.width * item.scale;
      const aspect = img.naturalHeight / Math.max(img.naturalWidth, 1);
      const height = width * aspect;
      const mapped = mapNormalizedToCanvas(
        item.x,
        item.y,
        videoRef.current?.videoWidth || canvas.width,
        videoRef.current?.videoHeight || canvas.height,
        canvas.width,
        canvas.height,
        MIRROR_CAMERA,
      );
      const x = mapped.x;
      const y = mapped.y;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(item.rotation);
      ctx.globalAlpha = item.opacity;
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(img, -width / 2, -height * 0.28, width, height);
      ctx.restore();
    },
    [],
  );

  const drawDebug = useCallback(
    (ctx: CanvasRenderingContext2D, faceInfo: any, poseInfo: any) => {
      if (!showDebug) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (faceInfo) {
        const points = [
          { x: faceInfo.chin.x, y: faceInfo.chin.y },
          { x: faceInfo.leftFaceSide.x, y: faceInfo.leftFaceSide.y },
          { x: faceInfo.rightFaceSide.x, y: faceInfo.rightFaceSide.y },
        ];

        ctx.fillStyle = "#00d1ff";
        points.forEach((point) => {
          const px = MIRROR_CAMERA
            ? (1 - point.x) * canvas.width
            : point.x * canvas.width;
          const py = point.y * canvas.height;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (poseInfo) {
        const left = { x: poseInfo.leftShoulder.x, y: poseInfo.leftShoulder.y };
        const right = {
          x: poseInfo.rightShoulder.x,
          y: poseInfo.rightShoulder.y,
        };
        const center = {
          x: poseInfo.shoulderCenterX,
          y: poseInfo.shoulderCenterY,
        };

        const leftPx = MIRROR_CAMERA
          ? (1 - left.x) * canvas.width
          : left.x * canvas.width;
        const rightPx = MIRROR_CAMERA
          ? (1 - right.x) * canvas.width
          : right.x * canvas.width;
        const centerPx = MIRROR_CAMERA
          ? (1 - center.x) * canvas.width
          : center.x * canvas.width;

        ctx.strokeStyle = "#ffab40";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leftPx, left.y * canvas.height);
        ctx.lineTo(rightPx, right.y * canvas.height);
        ctx.stroke();

        ctx.fillStyle = "#ffd166";
        [left, right, center].forEach((point, index) => {
          const px = index === 0 ? leftPx : index === 1 ? rightPx : centerPx;
          ctx.beginPath();
          ctx.arc(px, point.y * canvas.height, 5, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    },
    [showDebug],
  );

  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!video || !canvas || !img || !img.complete) {
      frameRef.current = requestAnimationFrame(() => renderLoopRef.current());
      return;
    }

    const rect = video.getBoundingClientRect();
    if (
      canvas.width !== Math.round(rect.width) ||
      canvas.height !== Math.round(rect.height)
    ) {
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      frameRef.current = requestAnimationFrame(() => renderLoopRef.current());
      return;
    }

    const faceTracker = faceLandmarkerRef.current;
    const poseTracker = poseLandmarkerRef.current;
    const handTracker = handLandmarkerRef.current;

    if (
      video.readyState >= 2 &&
      ((handMode && handTracker) || (!handMode && faceTracker && poseTracker))
    ) {
      const faceResult = faceTracker?.detectForVideo(video, performance.now());
      const poseResult = poseTracker?.detectForVideo(video, performance.now());
      const handResult = handTracker?.detectForVideo(video, performance.now());
      const faceLandmarks = faceResult?.faceLandmarks?.[0];
      const poseLandmarks = poseResult?.landmarks?.[0];
      const faceInfo = faceLandmarks ? getFaceInfo(faceLandmarks) : null;
      const poseInfo = poseLandmarks ? getPoseInfo(poseLandmarks) : null;
      const now = performance.now();
      const hasTracking = Boolean(faceLandmarks);
      if (hasTracking) trackingLostAtRef.current = null;
      else if (trackingLostAtRef.current === null)
        trackingLostAtRef.current = now;

      const lostForMs =
        trackingLostAtRef.current === null
          ? 0
          : now - trackingLostAtRef.current;
      const trackingOpacity = hasTracking
        ? 1
        : lostForMs <= 400
          ? 1
          : lostForMs >= 1000
            ? 0
            : 1 - (lostForMs - 400) / 600;
      const transforms = hasTracking
        ? computeJewelleryTransforms(
            productConfigRef.current as any,
            faceLandmarks,
            poseLandmarks,
            previousTransformsRef.current,
          )
        : previousTransformsRef.current;
      previousTransformsRef.current = transforms;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (handMode) {
        const handInfo = handResult?.landmarks?.[0]
          ? getHandInfo(handResult.landmarks[0])
          : null;
        const handTransform = handInfo
          ? productRef.current.type === "rings"
            ? calculateRingTransform(
                handInfo,
                productRef.current.handFitConfig?.finger ?? "ring",
                productRef.current.handFitConfig?.scaleMultiplier ?? 1,
              )
            : calculateBangleTransform(
                handInfo,
                productRef.current.handFitConfig?.scaleMultiplier ?? 1,
              )
          : null;

        if (handTransform) {
          drawJewelleryImage(ctx, img, {
            x:
              handTransform.x +
              (productRef.current.handFitConfig?.offsetX ?? 0),
            y:
              handTransform.y +
              (productRef.current.handFitConfig?.offsetY ?? 0),
            scale: handTransform.scale,
            rotation: handTransform.rotationZ,
            opacity: handTransform.opacity,
          });
        }

        frameRef.current = requestAnimationFrame(() => renderLoopRef.current());
        return;
      }

      if (productRef.current.type === "earrings") {
        const leftTransform = transforms.leftEarring ?? {
          x: 0.35,
          y: 0.35,
          scale: 0.14,
          rotation: 0,
          opacity: 1,
        };
        const rightTransform = transforms.rightEarring ?? {
          x: 0.65,
          y: 0.35,
          scale: 0.14,
          rotation: 0,
          opacity: 1,
        };
        drawJewelleryImage(
          ctx,
          leftImageRef.current ?? img,
          {
            ...leftTransform,
            opacity: leftTransform.opacity * trackingOpacity,
          },
          true,
        );
        drawJewelleryImage(
          ctx,
          rightImageRef.current ?? img,
          {
            ...rightTransform,
            opacity: rightTransform.opacity * trackingOpacity,
          },
          false,
        );
      } else {
        const necklaceTransform = transforms.necklace ?? {
          x: 0.5,
          y: 0.52,
          scale: 0.22,
          rotation: 0,
          opacity: 1,
        };
        const nextAR: ARTransform = {
          visible: true,
          x: clamp(necklaceTransform.x, 0.08, 0.92),
          y: clamp(necklaceTransform.y, 0.08, 0.92),
          scale: clamp(necklaceTransform.scale, 0.08, 0.9),
          rotationZ: clamp(necklaceTransform.rotation, -0.4, 0.4),
          yaw: faceInfo?.yaw ?? 0,
          pitch: 0,
        };

        smoothRef.current = {
          visible: true,
          x: smooth(smoothRef.current.x, nextAR.x, 0.2),
          y: smooth(smoothRef.current.y, nextAR.y, 0.2),
          scale: smooth(smoothRef.current.scale, nextAR.scale, 0.18),
          rotationZ: smooth(
            smoothRef.current.rotationZ,
            nextAR.rotationZ,
            0.12,
          ),
          yaw: smooth(smoothRef.current.yaw, nextAR.yaw, 0.18),
          pitch: smooth(smoothRef.current.pitch, nextAR.pitch, 0.18),
        };

        setTransform(smoothRef.current);
        drawJewelleryImage(
          ctx,
          img,
          {
            x: smoothRef.current.x,
            y: smoothRef.current.y,
            scale: smoothRef.current.scale,
            rotation: smoothRef.current.rotationZ,
            opacity: trackingOpacity,
          },
          false,
        );
      }

      drawDebug(ctx, faceInfo, poseInfo);
    }

    frameRef.current = requestAnimationFrame(() => renderLoopRef.current());
  }, [drawDebug, drawJewelleryImage, handMode]);

  useEffect(() => {
    renderLoopRef.current = renderLoop;
  }, [renderLoop]);

  const startTracking = useCallback(async () => {
    stopAll();
    setStatus("loading");
    setMessage(
      handMode
        ? "Starting camera and hand tracking…"
        : "Starting camera and face tracking…",
    );

    try {
      const isSecureContext =
        window.isSecureContext ||
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1";

      if (!isSecureContext) {
        throw new DOMException(
          "Camera access requires HTTPS or localhost.",
          "NotAllowedError",
        );
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException(
          "Webcam access is not supported in this browser.",
          "NotSupportedError",
        );
      }

      const stream = await requestCameraStream();

      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);

      if (!handMode)
        try {
          faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(
            fileset,
            {
              baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "GPU" },
              runningMode: "VIDEO",
              numFaces: 1,
              minFaceDetectionConfidence: 0.5,
              minFacePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
              outputFacialTransformationMatrixes: true,
            },
          );
        } catch {
          faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(
            fileset,
            {
              baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "CPU" },
              runningMode: "VIDEO",
              numFaces: 1,
              minFaceDetectionConfidence: 0.5,
              minFacePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
              outputFacialTransformationMatrixes: true,
            },
          );
        }

      if (!handMode)
        try {
          poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(
            fileset,
            {
              baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "GPU" },
              runningMode: "VIDEO",
              numPoses: 1,
              minPoseDetectionConfidence: 0.3,
              minPosePresenceConfidence: 0.3,
              minTrackingConfidence: 0.3,
            },
          );
        } catch {
          poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(
            fileset,
            {
              baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "CPU" },
              runningMode: "VIDEO",
              numPoses: 1,
              minPoseDetectionConfidence: 0.3,
              minPosePresenceConfidence: 0.3,
              minTrackingConfidence: 0.3,
            },
          );
        }

      setStatus("ready");
      if (handMode) {
        try {
          handLandmarkerRef.current = await HandLandmarker.createFromOptions(
            fileset,
            {
              baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "GPU" },
              runningMode: "VIDEO",
              numHands: 2,
              minHandDetectionConfidence: 0.35,
              minHandPresenceConfidence: 0.35,
              minTrackingConfidence: 0.35,
            },
          );
        } catch {
          handLandmarkerRef.current = await HandLandmarker.createFromOptions(
            fileset,
            {
              baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "CPU" },
              runningMode: "VIDEO",
              numHands: 2,
              minHandDetectionConfidence: 0.35,
              minHandPresenceConfidence: 0.35,
              minTrackingConfidence: 0.35,
            },
          );
        }
      }

      setMessage(
        handMode
          ? "Hold your hand comfortably in front of the camera."
          : "Move naturally — the jewellery will follow you.",
      );
      frameRef.current = requestAnimationFrame(renderLoop);
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
            "Camera access was blocked. Allow camera access for this site, then open it using HTTPS or localhost.";
        } else if (error.name === "NotSupportedError") {
          friendlyMessage =
            "This browser does not support webcam access. Try Chrome or Edge.";
        } else if (error.name === "OverconstrainedError") {
          friendlyMessage =
            "This camera configuration is not supported on this device. Please try again with the default camera settings.";
        } else if (error.name === "NotReadableError") {
          friendlyMessage =
            "The camera is already in use by another app. Close other camera apps and try again.";
        }
      } else if (error instanceof TypeError) {
        friendlyMessage =
          "This browser could not access the camera. Use the latest Chrome or Safari over HTTPS and allow camera access.";
      }

      setStatus("error");
      setMessage(friendlyMessage);
    }
  }, [handMode, renderLoop, stopAll]);

  useEffect(() => {
    // Camera startup is an external browser side effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startTracking();
    return stopAll;
  }, [startTracking, stopAll]);

  const capture = () => {
    const video = videoRef.current;
    const overlay = canvasRef.current;
    if (!video || !overlay) return;

    const rect = video.getBoundingClientRect();
    const output = document.createElement("canvas");
    output.width = Math.round(rect.width * 1.5);
    output.height = Math.round(rect.height * 1.5);

    const ctx = output.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.translate(output.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, output.width, output.height);
    ctx.restore();

    if (!is3D) ctx.drawImage(overlay, 0, 0, output.width, output.height);
    onSnapshot?.(output.toDataURL("image/jpeg", 0.9));
  };

  const statusClass = useMemo(() => `mirrorStatus ${status}`, [status]);

  return (
    <>
      <div className="mirrorShell">
        <div
          className="mirrorStage"
          data-kiosk-screen={`${kioskCalibration.screenWidth}x${kioskCalibration.screenHeight}`}
        >
          <video
            ref={videoRef}
            className="mirrorVideo"
            playsInline
            muted
            style={{ transform: MIRROR_CAMERA ? "scaleX(-1)" : undefined }}
          />
          <canvas ref={canvasRef} className="mirrorCanvas" />
          {is3D && (
            <ThreeJewelleryLayer product={product} transform={transform} />
          )}
          <div className="cameraGuide" aria-hidden="true" />
          {status === "ready" && (
            <div className="modeGuidance" role="status">
              {guidance}
            </div>
          )}
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
          <button className="secondaryButton" onClick={() => startTracking()}>
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

      {process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_ENABLE_CALIBRATION === "true" ? (
        <JewelleryCalibrationPanel
          product={productConfig as JewelleryProduct}
          calibration={calibration}
          onChange={updateCalibration}
          onReset={resetCalibration}
        />
      ) : null}

      {process.env.NODE_ENV === "development" && (
        <label
          style={{
            position: "fixed",
            right: 16,
            bottom: 120,
            zIndex: 35,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 12,
            background: "rgba(12,9,8,0.88)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <input
            type="checkbox"
            checked={showDebug}
            onChange={() => setShowDebug((value) => !value)}
          />
          Show debug landmarks
        </label>
      )}
    </>
  );
}

function getFaceInfo(faceLandmarks: any[]) {
  if (!faceLandmarks || faceLandmarks.length < 10) return null;

  const chin = faceLandmarks[152] ?? faceLandmarks[10] ?? faceLandmarks[0];
  const nose = faceLandmarks[1] ?? faceLandmarks[0];
  const forehead = faceLandmarks[10] ?? faceLandmarks[0];
  const leftFaceSide =
    faceLandmarks[234] ??
    faceLandmarks[127] ??
    faceLandmarks[93] ??
    faceLandmarks[4] ??
    faceLandmarks[0];
  const rightFaceSide =
    faceLandmarks[454] ??
    faceLandmarks[356] ??
    faceLandmarks[323] ??
    faceLandmarks[14] ??
    faceLandmarks[0];

  if (!chin || !nose || !forehead || !leftFaceSide || !rightFaceSide)
    return null;

  const faceWidth = Math.hypot(
    leftFaceSide.x - rightFaceSide.x,
    leftFaceSide.y - rightFaceSide.y,
  );
  const faceHeight = Math.hypot(forehead.x - chin.x, forehead.y - chin.y);
  const centerX = (leftFaceSide.x + rightFaceSide.x) / 2;
  const centerY = (leftFaceSide.y + rightFaceSide.y) / 2;
  const yaw = (nose.x - centerX) / Math.max(faceWidth, 0.001);

  return {
    chin,
    nose,
    forehead,
    leftFaceSide,
    rightFaceSide,
    centerX,
    centerY,
    faceWidth,
    faceHeight,
    yaw: clamp(yaw, -1, 1),
  };
}

function getPoseInfo(poseLandmarks: any[]) {
  if (!poseLandmarks || poseLandmarks.length < 12) return null;

  const leftShoulder = poseLandmarks[11] ?? poseLandmarks[5];
  const rightShoulder = poseLandmarks[12] ?? poseLandmarks[6];

  if (!leftShoulder || !rightShoulder) return null;

  const shoulderWidth = Math.hypot(
    rightShoulder.x - leftShoulder.x,
    rightShoulder.y - leftShoulder.y,
  );

  if (shoulderWidth < 0.02) return null;

  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;

  return {
    leftShoulder,
    rightShoulder,
    shoulderWidth,
    shoulderCenterX,
    shoulderCenterY,
    yaw: 0,
  };
}
