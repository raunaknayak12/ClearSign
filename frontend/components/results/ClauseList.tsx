/**
 * ClearSign v1.0 — Clause List Component
 *
 * Phase 7.5 — Renders the streaming list of clause cards.
 * - Maps analysisState.clauses → ClauseCard components
 * - Cards stream in with staggered animation
 * - Skeleton placeholders during loading
 * - Small toolbar row for dynamic counts and filters
 * - Inline QAPanel flows directly below the last card
 * - aria-live="polite" for screen reader announcements
 */

"use client";

import { useState } from "react";
import type { ClauseCard as ClauseCardType } from "@/types";
import ClauseCard, { ClauseCardSkeleton } from "./ClauseCard";
import { Accordion } from "@/components/ui/accordion";

interface ClauseListProps {
  clauses: ClauseCardType[];
  isLoading: boolean;
  isComplete: boolean;
  onAskAbout: (clause: ClauseCardType) => void;
}

export default function ClauseList({
  clauses,
  isLoading,
  isComplete,
  onAskAbout,
}: ClauseListProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);

  const visibleClauses = showFlaggedOnly
    ? clauses.filter((c) => c.risk === "flag")
    : clauses;

  const handleExpandAll = () => {
    if (allExpanded) {
      setExpandedItems([]);
      setAllExpanded(false);
    } else {
      setExpandedItems(visibleClauses.map((c) => c.clause_id));
      setAllExpanded(true);
    }
  };

  return (
    <div aria-live="polite" aria-label="Clause analysis results" className="pb-8">
      {/* Small toolbar row */}
      {clauses.length > 0 && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[12px] font-medium text-[#4B5563]">
            {visibleClauses.length} clauses
          </span>
          <div className="flex items-center gap-2 text-[12px] text-[#2C5EE8]">
            <button onClick={handleExpandAll} className="hover:underline">
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
            <span className="text-[#E2E8F0]">|</span>
            <button
              onClick={() => setShowFlaggedOnly((prev) => !prev)}
              className="hover:underline"
            >
              {showFlaggedOnly ? "Show all" : "Show flagged only"}
            </button>
          </div>
        </div>
      )}

      {/* Clause cards */}
      <Accordion
        type="multiple"
        value={expandedItems}
        onValueChange={setExpandedItems}
        className="space-y-3 w-full"
      >
        {visibleClauses.map((clause, index) => (
          <div
            key={clause.clause_id}
            className="animate-in"
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <ClauseCard clause={clause} onAskAbout={onAskAbout} />
          </div>
        ))}
      </Accordion>

      {/* Skeleton placeholders while loading */}
      {isLoading && visibleClauses.length === 0 && (
        <div className="space-y-3">
          <ClauseCardSkeleton />
          <ClauseCardSkeleton />
          <ClauseCardSkeleton />
        </div>
      )}

      {/* Loading more indicator */}
      {isLoading && visibleClauses.length > 0 && !isComplete && (
        <div className="mt-3">
          <ClauseCardSkeleton />
        </div>
      )}

    </div>
  );
}
