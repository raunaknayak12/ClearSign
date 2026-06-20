/**
 * ClearSign v1.0 — Disclaimer Banner
 *
 * Phase 7.2 — Non-dismissible amber banner per UX Brief §6.7.
 * Always visible on /analyse. No close/dismiss button (F09).
 */

import { Info } from "lucide-react";
import { UI_COPY } from "@/lib/constants";

export default function Disclaimer() {
  return (
    <div
      className="w-full bg-[#FFFBEB] border-b border-[#FDE68A] px-4 py-3"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-[800px] mx-auto flex items-start gap-3">
        <Info className="h-4 w-4 text-[#92400E] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#92400E] leading-relaxed">
          {UI_COPY.DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
