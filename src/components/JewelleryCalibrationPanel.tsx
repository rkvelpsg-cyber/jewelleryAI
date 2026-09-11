"use client";

import { useMemo, useState } from "react";
import type { JewelleryProduct } from "@/types";

interface CalibrationPanelProps {
  product: JewelleryProduct;
  calibration: Partial<JewelleryProduct>;
  onChange: (key: keyof JewelleryProduct, value: number) => void;
  onReset: () => void;
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#d8d0c6" }}>
      <span>{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ flex: 1 }}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{
            width: 70,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "#100d0b",
            color: "#fff",
          }}
        />
      </div>
    </label>
  );
}

export default function JewelleryCalibrationPanel({
  product,
  calibration,
  onChange,
  onReset,
}: CalibrationPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [copiedMessage, setCopiedMessage] = useState("");

  const enabled =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ENABLE_CALIBRATION === "true";
  const isEarring = product.type === "earrings";

  const values = useMemo(() => {
    const base = {
      scaleMultiplier:
        calibration.scaleMultiplier ?? product.scaleMultiplier ?? 1.05,
      offsetX: calibration.offsetX ?? product.offsetX ?? 0,
      offsetY: calibration.offsetY ?? product.offsetY ?? 0,
      verticalAnchorRatio:
        calibration.verticalAnchorRatio ?? product.verticalAnchorRatio ?? 0.48,
      rotationOffset: calibration.rotationOffset ?? product.rotationOffset ?? 0,
    };

    return {
      ...base,
      earringScaleMultiplier:
        calibration.earringScaleMultiplier ??
        product.earringScaleMultiplier ??
        0.16,
      leftOffsetX: calibration.leftOffsetX ?? product.leftOffsetX ?? -0.02,
      leftOffsetY: calibration.leftOffsetY ?? product.leftOffsetY ?? 0.04,
      rightOffsetX: calibration.rightOffsetX ?? product.rightOffsetX ?? 0.02,
      rightOffsetY: calibration.rightOffsetY ?? product.rightOffsetY ?? 0.04,
      yawScaleStrength:
        calibration.yawScaleStrength ?? product.yawScaleStrength ?? 0.2,
      yawOpacityStrength:
        calibration.yawOpacityStrength ?? product.yawOpacityStrength ?? 0.5,
    };
  }, [calibration, product]);

  if (!enabled) return null;

  const copyJson = async (mode: "calibration" | "full") => {
    const payload =
      mode === "calibration"
        ? JSON.stringify(
            {
              scaleMultiplier: values.scaleMultiplier,
              offsetX: values.offsetX,
              offsetY: values.offsetY,
              verticalAnchorRatio: values.verticalAnchorRatio,
              rotationOffset: values.rotationOffset,
              ...(isEarring
                ? {
                    earringScaleMultiplier: values.earringScaleMultiplier,
                    leftOffsetX: values.leftOffsetX,
                    leftOffsetY: values.leftOffsetY,
                    rightOffsetX: values.rightOffsetX,
                    rightOffsetY: values.rightOffsetY,
                    yawScaleStrength: values.yawScaleStrength,
                    yawOpacityStrength: values.yawOpacityStrength,
                  }
                : {}),
            },
            null,
            2,
          )
        : JSON.stringify(product, null, 2);

    await navigator.clipboard.writeText(payload);
    setCopiedMessage("Copied!");
    window.setTimeout(() => setCopiedMessage(""), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        width: 320,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(12,9,8,0.92)",
        color: "#fff",
        boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
        zIndex: 30,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setCollapsed((current) => !current)}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: 0,
          background: "rgba(215,174,94,0.12)",
          color: "#f0d18a",
          fontWeight: 700,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        {collapsed ? "Show calibration" : "Hide calibration"} · {product.type}
      </button>

      {!collapsed && (
        <div style={{ display: "grid", gap: 12, padding: 12 }}>
          {!isEarring && (
            <>
              <NumberField
                label="Scale"
                value={values.scaleMultiplier}
                min={0.3}
                max={2.5}
                step={0.01}
                onChange={(next) => onChange("scaleMultiplier", next)}
              />
              <NumberField
                label="Offset X"
                value={values.offsetX}
                min={-0.6}
                max={0.6}
                step={0.01}
                onChange={(next) => onChange("offsetX", next)}
              />
              <NumberField
                label="Offset Y"
                value={values.offsetY}
                min={-0.6}
                max={0.6}
                step={0.01}
                onChange={(next) => onChange("offsetY", next)}
              />
              <NumberField
                label="Vertical anchor"
                value={values.verticalAnchorRatio}
                min={0.1}
                max={0.9}
                step={0.01}
                onChange={(next) => onChange("verticalAnchorRatio", next)}
              />
              <NumberField
                label="Rotation offset"
                value={values.rotationOffset}
                min={-0.8}
                max={0.8}
                step={0.01}
                onChange={(next) => onChange("rotationOffset", next)}
              />
            </>
          )}

          {isEarring && (
            <>
              <NumberField
                label="Earring scale"
                value={values.earringScaleMultiplier}
                min={0.05}
                max={0.5}
                step={0.01}
                onChange={(next) => onChange("earringScaleMultiplier", next)}
              />
              <NumberField
                label="Left offset X"
                value={values.leftOffsetX}
                min={-0.5}
                max={0.5}
                step={0.01}
                onChange={(next) => onChange("leftOffsetX", next)}
              />
              <NumberField
                label="Left offset Y"
                value={values.leftOffsetY}
                min={-0.5}
                max={0.5}
                step={0.01}
                onChange={(next) => onChange("leftOffsetY", next)}
              />
              <NumberField
                label="Right offset X"
                value={values.rightOffsetX}
                min={-0.5}
                max={0.5}
                step={0.01}
                onChange={(next) => onChange("rightOffsetX", next)}
              />
              <NumberField
                label="Right offset Y"
                value={values.rightOffsetY}
                min={-0.5}
                max={0.5}
                step={0.01}
                onChange={(next) => onChange("rightOffsetY", next)}
              />
              <NumberField
                label="Yaw scale"
                value={values.yawScaleStrength}
                min={0}
                max={1}
                step={0.01}
                onChange={(next) => onChange("yawScaleStrength", next)}
              />
              <NumberField
                label="Yaw opacity"
                value={values.yawOpacityStrength}
                min={0}
                max={1}
                step={0.01}
                onChange={(next) => onChange("yawOpacityStrength", next)}
              />
            </>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={onReset}
              style={{
                flex: 1,
                background: "#1e1814",
                color: "#f5d8a0",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
            <button
              onClick={() => copyJson("calibration")}
              style={{
                flex: 1,
                background: "#1e1814",
                color: "#f5d8a0",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              Copy calibration
            </button>
            <button
              onClick={() => copyJson("full")}
              style={{
                flex: 1,
                background: "#1e1814",
                color: "#f5d8a0",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              Full JSON
            </button>
          </div>

          {copiedMessage && (
            <div style={{ fontSize: 12, color: "#7fe0a5" }}>
              {copiedMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
