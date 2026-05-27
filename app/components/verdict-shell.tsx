"use client";

import type { ReactNode } from "react";
import { HeroVideoBackground } from "@/components/hero-video-background";

export function VerdictShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <HeroVideoBackground />
      <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
    </div>
  );
}
