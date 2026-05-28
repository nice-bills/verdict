"use client";

import { useEffect, useRef } from "react";

const HERO_VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4";

const FADE_MS = 500;
const FADE_BEFORE_END_S = 0.55;

export function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadingOutRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const cancelFade = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const currentOpacity = () => {
      const o = parseFloat(video.style.opacity);
      return Number.isFinite(o) ? o : 1;
    };

    const fadeTo = (target: number, onDone?: () => void) => {
      cancelFade();
      const from = currentOpacity();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / FADE_MS);
        video.style.opacity = String(from + (target - from) * t);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
          onDone?.();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const restartLoop = () => {
      video.style.opacity = "0";
      window.setTimeout(() => {
        video.currentTime = 0;
        void video.play().catch(() => {});
        fadingOutRef.current = false;
        fadeTo(1);
      }, 100);
    };

    const onLoaded = () => {
      video.style.opacity = "0";
      fadeTo(1);
    };

    const onTimeUpdate = () => {
      const d = video.duration;
      if (!d || !Number.isFinite(d) || fadingOutRef.current) return;
      if (d - video.currentTime <= FADE_BEFORE_END_S) {
        fadingOutRef.current = true;
        fadeTo(0, restartLoop);
      }
    };

    const onEnded = () => {
      if (fadingOutRef.current) return;
      fadingOutRef.current = true;
      cancelFade();
      restartLoop();
    };

    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);

    return () => {
      cancelFade();
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 min-h-screen overflow-hidden bg-gray-950" aria-hidden>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover translate-y-[17%]"
        src={HERO_VIDEO_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-label="Decorative background video"
        tabIndex={-1}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/85" />
    </div>
  );
}
