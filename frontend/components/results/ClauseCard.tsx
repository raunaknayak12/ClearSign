/**
 * ClearSign v1.0 — Redesigned Clause Card Component
 *
 * Based on MynaUI and Myna Hero design patterns:
 * - font-mono typography
 * - rounded-none borders
 * - bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm backgrounds
 * - Category-specific Lucide icons mapped on the left
 */

import React from "react";
import type { ClauseCard as ClauseCardType, ClauseType } from "@/types";
import { UI_COPY } from "@/lib/constants";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Lock,
  Scale,
  AlertTriangle,
  Clock,
  CreditCard,
  XCircle,
  Sparkles,
  Shield,
} from "lucide-react";

interface ClauseCardProps {
  clause: ClauseCardType;
  onAskAbout: (clause: ClauseCardType) => void;
}

const categoryIcons: Record<ClauseType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  payment: CreditCard,
  termination: XCircle,
  penalty_liability: AlertTriangle,
  notice_period: Clock,
  confidentiality: Lock,
  jurisdiction: Scale,
  non_standard: Sparkles,
  standard: Shield,
};

const categoryColors: Record<ClauseType, string> = {
  standard: '#6B7280',
  confidentiality: '#0EA5E9',
  notice_period: '#0EA5E9',
  payment: '#2C5EE8',
  jurisdiction: '#D97706',
  non_standard: '#D97706',
  termination: '#DC2626',
  penalty_liability: '#DC2626',
};

export default function ClauseCard({ clause, onAskAbout }: ClauseCardProps) {
  const CategoryIcon = categoryIcons[clause.clause_type] || Shield;
  const iconColor = categoryColors[clause.clause_type] || '#6B7280';

  let riskStyle =
    "border-[#BBF7D0] text-[#166534] bg-[#F0FDF4]";
  let riskLabel = "Standard";
  if (clause.risk === "review") {
    riskStyle =
      "border-[#FDE68A] text-[#92400E] bg-[#FFFBEB]";
    riskLabel = "Review";
  } else if (clause.risk === "flag") {
    riskStyle =
      "border-[#FECACA] text-[#991B1B] bg-[#FEF2F2]";
    riskLabel = "Flag";
  }

  return (
    <AccordionItem
      value={clause.clause_id}
      className="bg-white/60 backdrop-blur-sm border border-slate-200 rounded-none overflow-hidden
                 transition-all duration-200 ease-out shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-b-0 font-mono"
    >
      {/* ── Header Trigger ── */}
      <AccordionTrigger
        className="w-full bg-[#F8F9FC]/60 p-4 flex items-center justify-between gap-3
                   text-left min-h-[44px] cursor-pointer hover:bg-[#F1F5FD]/60 transition-colors
                   no-underline hover:underline [&[data-state=open]>svg]:rotate-180 py-4 font-normal"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
          {/* MynaUI Mapped Category Icon */}
          <span className="shrink-0 p-2 rounded-full bg-slate-100/50 flex items-center justify-center">
            <CategoryIcon className="h-4 w-4" style={{ color: iconColor }} />
          </span>

          {/* Title and Preview Subtitle */}
          <div className="flex flex-col min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-800 truncate">
              {clause.clause_title}
            </h3>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5 truncate font-normal">
              {clause.explanation.split(".")[0].slice(0, 80)}
            </p>
          </div>

          {/* Non-standard flag */}
          {clause.is_non_standard && (
            <span className="text-[10px] font-semibold text-orange-600 bg-orange-100
                           rounded-none px-2 py-0.5 whitespace-nowrap shrink-0">
              ⚠ Non-Standard
            </span>
          )}

          {/* Risk Badge */}
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-none border shrink-0 ${riskStyle}`}>
            {riskLabel}
          </span>
        </div>
      </AccordionTrigger>

      {/* ── Body Content (expandable) ── */}
      <AccordionContent className="p-0">
        <div className="p-4 space-y-4">
          {/* Explanation */}
          <p className="text-sm leading-[1.7] text-[#4B5563]">
            {clause.explanation}
          </p>

          {/* Original text block */}
          <div className="bg-slate-50/50 rounded-none p-3 border border-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Original Text
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {clause.original_text}
            </p>
          </div>

          {/* Grounding statement */}
          {clause.grounding_statement && (
            <p className="text-xs text-slate-400 italic">
              {clause.grounding_statement}
            </p>
          )}

          {/* Ask about this clause CTA */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAskAbout(clause);
            }}
            className="text-sm font-semibold text-[#4F6EF7] hover:text-[#2C5EE8]
                       transition-colors min-h-[44px] flex items-center hover:underline"
            aria-label={`Ask about ${clause.clause_title}`}
          >
            {UI_COPY.CTA_ASK_CLAUSE}
          </button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/**
 * Skeleton placeholder for clause cards during SSE loading.
 */
export function ClauseCardSkeleton() {
  return (
    <div className="bg-white/60 backdrop-blur-sm border border-slate-200 rounded-none shadow-sm overflow-hidden animate-pulse font-mono">
      <div className="bg-[#F8F9FC]/60 p-4 flex items-center gap-3">
        <div className="h-8 w-8 bg-slate-200 rounded-full" />
        <div className="h-4 w-48 bg-slate-200 rounded-none" />
      </div>
      <div className="p-4 space-y-3">
        <div className="h-3 w-full bg-slate-100 rounded-none" />
        <div className="h-3 w-5/6 bg-slate-100 rounded-none" />
      </div>
    </div>
  );
}
