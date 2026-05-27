"use client";

/**
 * Ambient full-screen backdrop — mirrors reference video's cinematic loop.
 * Uses CSS gradients + optional muted video (no copyrighted source assets).
 */
export function CinematicBackground() {
  return (
    <div className="cinematic-bg" aria-hidden>
      <div className="cinematic-bg__mesh" />
      <div className="cinematic-bg__scrim" />
    </div>
  );
}
