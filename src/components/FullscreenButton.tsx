"use client";

import { Maximize2 } from "lucide-react";

export default function FullscreenButton() {
  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // Browser may require a user gesture or may not support the API.
    }
  };

  return (
    <button className="iconButton" onClick={enterFullscreen} aria-label="Toggle fullscreen">
      <Maximize2 size={22} />
    </button>
  );
}
