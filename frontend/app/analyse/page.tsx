/**
 * ClearSign v1.0 — Analyse Page (Results + Q&A)
 *
 * Route: /analyse
 * Phase 7.1 — Three fixed zones: header, disclaimer+progress, clause list.
 * Q&A panel fixed at bottom. Clause cards stream in progressively.
 *
 * Per App Flow §8 — redirects to / if no active file.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClauseCard as ClauseCardType, ClauseType } from "@/types";
import Disclaimer from "@/components/shared/Disclaimer";
import { ResultsHeader } from "@/components/results/ResultsHeader";
import ClauseList from "@/components/results/ClauseList";
import { useSSE, getDocumentTypeCode } from "@/hooks/useSSE";
import { analyseDocument, downloadReport } from "@/lib/api";

import { CLAUSE_TYPE_LABELS, UI_COPY, API_BASE_URL } from "@/lib/constants";
import { getPendingFile, hasPendingFile } from "@/lib/fileStore";
import { motion, AnimatePresence } from "framer-motion";
import Dock from "@/components/ui/dock";
import AIChatCard from "@/components/ui/ai-chat";
import { Share2, Download, MessageCircle, Home } from "lucide-react";

export default function AnalysePage() {
  const router = useRouter();
  const { state: sseState, consumeStream, reset: resetSSE, loadAnalysis } = useSSE();
  const [activeClause, setActiveClause] = useState<ClauseCardType | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<ClauseType | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const startedRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const hasDemoParam = window.location.search.includes("demo=true");
      const hasPending = hasPendingFile();
      setIsDemo(hasDemoParam && !hasPending);
    }
  }, []);

  const [demoState, setDemoState] = useState({
    clauses: [] as ClauseCardType[],
    documentType: "Non-Disclosure Agreement (Demo)",
    documentTypeCode: "NDA",
    pageCount: 3,
    fileName: "nda_template_demo.pdf",
    totalClauses: 5,
    isComplete: false,
    progressPercent: 0,
    progressMessage: "Analysing your document...",
    error: null as string | null,
    analysisId: null as string | null,
  });

  const state = isDemo ? demoState : sseState;

  // On mount, check for URL ID parameter, then check pending file
  useEffect(() => {
    if (!mounted) return;
    if (startedRef.current) return;

    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");

    if (id && id !== "undefined") {
      startedRef.current = true;
      setHasStarted(true);

      (async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/analysis/${id}`);
          if (!response.ok) {
            throw new Error("Analysis not found");
          }
          const cachedData = await response.json();
          resetSSE();
          loadAnalysis(id, cachedData.document_type, cachedData.clauses);
        } catch (err) {
          console.error(err);
          setDemoState(prev => ({
            ...prev,
            error: "Failed to load shared analysis. Please upload your document instead.",
            isComplete: true
          }));
        }
      })();
      return;
    }

    if (isDemo) return;
    
    const file = getPendingFile();
    if (!file) {
      // No file — redirect to upload page (App Flow §8)
      router.push("/");
      return;
    }

    startedRef.current = true;
    setHasStarted(true);

    const fileName = file.name;
    const getPageCount = async (f: File): Promise<number | null> => {
      if (f.type !== "application/pdf" && !f.name.endsWith(".pdf")) {
        return null;
      }
      try {
        const arrayBuffer = await f.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer.slice(0, 100 * 1024));
        const match = text.match(/\/Count\s+(\d+)/);
        if (match) return parseInt(match[1], 10);
        
        const fullText = new TextDecoder().decode(arrayBuffer);
        const countMatch = fullText.match(/\/Count\s+(\d+)/);
        if (countMatch) return parseInt(countMatch[1], 10);
        
        const pages = fullText.match(/\/Type\s*\/Page\b/g);
        return pages ? pages.length : null;
      } catch {
        return null;
      }
    };

    // Start the analysis
    (async () => {
      try {
        const pageCount = await getPageCount(file);
        const response = await analyseDocument(file);
        await consumeStream(response, { fileName, pageCount });
      } catch {
        // Error is handled in SSE state
      }
    })();
  }, [mounted, router, consumeStream, isDemo, loadAnalysis, resetSSE]);

  // Demo progression simulator
  useEffect(() => {
    if (!isDemo || demoState.isComplete) return;

    startedRef.current = true;
    setHasStarted(true);

    const mockClauses: ClauseCardType[] = [
      {
        clause_id: "1",
        clause_title: "Confidential Information Definition",
        clause_type: "confidentiality",
        original_text: "Confidential Information shall include all information or material that has or could have commercial value or other utility in the business in which Disclosing Party is engaged.",
        explanation: "This defines what information you must keep secret. It is very broad and covers almost everything.",
        is_non_standard: false,
        grounding_statement: null,
        risk: "standard",
      },
      {
        clause_id: "2",
        clause_title: "Indemnification & Liabilities",
        clause_type: "penalty_liability",
        original_text: "Receiving Party agrees to indemnify and hold harmless Disclosing Party from any and all claims, liabilities, damages, or costs arising out of any breach of this Agreement.",
        explanation: "If you leak any information, you must pay all of the other party's legal fees and damages.",
        is_non_standard: true,
        grounding_statement: null,
        risk: "flag",
      },
      {
        clause_id: "3",
        clause_title: "Governing Law",
        clause_type: "jurisdiction",
        original_text: "This Agreement shall be governed by and construed in accordance with the laws of the State of New York, without giving effect to any choice of law principles.",
        explanation: "Any disputes regarding this agreement will be decided under New York state law.",
        is_non_standard: false,
        grounding_statement: null,
        risk: "review",
      },
      {
        clause_id: "4",
        clause_title: "Termination Notice Period",
        clause_type: "notice_period",
        original_text: "Either party may terminate this Agreement upon thirty (30) days written notice to the other party.",
        explanation: "You or the other party can end the agreement by giving a 30-day written notice.",
        is_non_standard: false,
        grounding_statement: null,
        risk: "review",
      },
      {
        clause_id: "5",
        clause_title: "Immediate Termination for Cause",
        clause_type: "termination",
        original_text: "Disclosing Party may terminate this Agreement immediately and without notice if Receiving Party breaches any confidentiality obligations.",
        explanation: "The other party can end the agreement immediately if you violate any confidentiality terms, without giving you time to cure.",
        is_non_standard: true,
        grounding_statement: null,
        risk: "flag",
      },
    ];

    const nextIndex = demoState.clauses.length;
    if (nextIndex >= mockClauses.length) {
      setDemoState((prev) => ({
        ...prev,
        isComplete: true,
        progressPercent: 100,
        progressMessage: "Analysis complete — 5 clauses covered",
      }));
      return;
    }

    const timer = setTimeout(() => {
      setDemoState((prev) => {
        const idx = prev.clauses.length;
        if (idx >= mockClauses.length) return prev;
        const nextClause = mockClauses[idx];
        const updatedClauses = [...prev.clauses, nextClause];
        const nextPercent = Math.round((updatedClauses.length / mockClauses.length) * 100);
        return {
          ...prev,
          clauses: updatedClauses,
          progressPercent: nextPercent,
          progressMessage: nextPercent === 100
            ? "Analysis complete — 5 clauses covered"
            : `Analysing clause ${updatedClauses.length + 1} of 5...`,
        };
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [isDemo, demoState.clauses.length, demoState.isComplete]);

  // Handle "Ask about this clause" from ClauseCard
  const handleAskAbout = useCallback((clause: ClauseCardType) => {
    setActiveClause(clause);
    setIsChatOpen(true);
  }, []);

  // Handle "Ask AI" from Floating Dock
  const handleAskAI = useCallback(() => {
    setIsChatOpen(true);
  }, []);

  // Handle category badge filter toggle
  const handleCategoryFilter = useCallback((type: ClauseType) => {
    setActiveCategoryFilter((prev) => (prev === type ? null : type));
  }, []);

  // Handle Share action
  const handleShare = useCallback(() => {
    if (typeof window !== "undefined") {
      const shareId = state.analysisId;
      const shareUrl = shareId 
        ? `${window.location.origin}/analyse?id=${shareId}`
        : window.location.href;
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  }, [state.analysisId]);


  // Handle Download action
  const handleDownload = useCallback(async () => {
    try {
      const clauses = state.clauses;
      const docType = state.documentType;

      if (!clauses || clauses.length === 0) {
        alert("No clauses to download yet.");
        return;
      }

      const blob = await downloadReport(docType, clauses);

      // Create a temporary link element and click it to download the file
      if (typeof window !== "undefined") {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${docType.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_report.pdf`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to download report PDF.";
      alert(errorMessage);
    }
  }, [state.clauses, state.documentType]);


  // Handle "Try Again" — back to upload
  const handleTryAgain = useCallback(() => {
    resetSSE();
    router.push("/");
  }, [resetSSE, router]);

  const countsByType = state.clauses.reduce((acc, c) => {
    acc[c.clause_type] = (acc[c.clause_type] || 0) + 1;
    return acc;
  }, {} as Record<ClauseType, number>);

  const categoryColors: Record<ClauseType, 'blue' | 'red' | 'yellow' | 'orange'> = {
    standard: 'blue',
    confidentiality: 'blue',
    notice_period: 'blue',
    payment: 'blue',
    jurisdiction: 'yellow',
    non_standard: 'orange',
    termination: 'red',
    penalty_liability: 'red',
  };

  const categories = (Object.keys(countsByType) as ClauseType[]).map((type) => ({
    label: CLAUSE_TYPE_LABELS[type] || type,
    count: countsByType[type],
    color: categoryColors[type] || 'blue',
    type,
  }));

  // Compute filtered clauses based on active category filter
  const filteredClauses = activeCategoryFilter
    ? state.clauses.filter((c) => c.clause_type === activeCategoryFilter)
    : state.clauses;

  const dockItems = [
    {
      icon: Home,
      label: "Home",
      onClick: handleTryAgain,
      isActive: false,
    },
    {
      icon: Share2,
      label: "Share",
      onClick: handleShare,
      isActive: false,
    },
    {
      icon: Download,
      label: "Download",
      onClick: handleDownload,
      isActive: false,
    },
    {
      icon: MessageCircle,
      label: "Ask AI",
      onClick: handleAskAI,
      isActive: isChatOpen,
    },
  ];

  const isLoading = hasStarted && !state.isComplete && !state.error;

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* ── Skip Links (Phase 9.5) ── */}
      <a
        href="#clause-list"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 
                   focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg
                   focus:shadow-lg focus:text-[#4F6EF7]"
      >
        Skip to clause list
      </a>
      <a
        href="#qa-input"
        onClick={() => {
          setIsChatOpen(true);
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-48 
                   focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg
                   focus:shadow-lg focus:text-[#4F6EF7]"
      >
        Skip to Q&amp;A
      </a>

      {/* ── Unified Results Header ── */}
      <ResultsHeader
        documentTitle={state.documentType || "Analyzing Document..."}
        documentSubtitle={`${state.documentTypeCode || getDocumentTypeCode(state.documentType)} - ${state.pageCount !== null ? `${state.pageCount} pages` : "—"} · Analysed just now`}
        clausesCount={state.clauses.length}
        needReviewCount={state.clauses.filter((c) => c.risk === "flag").length}
        categories={categories}
        isComplete={state.isComplete}
        onBack={handleTryAgain}
        onDownload={handleDownload}
        onShare={handleShare}
        activeCategoryFilter={activeCategoryFilter}
        onCategoryFilter={handleCategoryFilter}
      />

      {/* ── Error State ── */}
      {state.error && state.clauses.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="text-center space-y-4 max-w-md">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-xl" role="img" aria-label="Warning">⚠️</span>
            </div>
            <p className="text-slate-700 font-medium">{state.error}</p>
            <button
              onClick={handleTryAgain}
              className="px-6 py-3 text-sm font-semibold text-red-600 
                       border border-red-300 rounded-lg hover:bg-red-50
                       transition-colors min-h-[44px]"
            >
              {UI_COPY.CTA_TRY_DIFFERENT}
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content Area: Side-by-side on desktop ── */}
      {(state.clauses.length > 0 || isLoading) && (
        <div className={`flex-1 flex flex-col md:flex-row w-full transition-all duration-300 ease-in-out`}>
          {/* ── Left Column: Clause List ── */}
          <main
            id="clause-list"
            className={`flex-1 min-w-0 px-4 md:px-8 py-6 pb-[140px] transition-all duration-300 ease-in-out ${
              isChatOpen ? 'md:max-w-none' : 'max-w-[800px] mx-auto w-full'
            }`}
          >
            {/* Active filter indicator */}
            {activeCategoryFilter && (
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="text-xs text-slate-500 font-mono">
                  Filtering by: <strong className="text-slate-700">{CLAUSE_TYPE_LABELS[activeCategoryFilter]}</strong>
                </span>
                <button
                  onClick={() => setActiveCategoryFilter(null)}
                  className="text-xs text-[#2C5EE8] hover:underline font-mono"
                >
                  Clear filter
                </button>
              </div>
            )}
            <ClauseList
              clauses={filteredClauses}
              isLoading={isLoading}
              isComplete={state.isComplete}
              onAskAbout={handleAskAbout}
            />
            {(state.clauses.length > 0 || state.isComplete) && (
              <div className="mt-6">
                <Disclaimer />
              </div>
            )}
          </main>

          {/* ── Right Column: AI Chat (Desktop — inline, not overlay) ── */}
          <AnimatePresence>
            {isChatOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "420px", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className="hidden md:flex flex-col shrink-0 border-l border-slate-200 overflow-hidden"
                style={{ minHeight: "calc(100vh - 200px)" }}
              >
                <div className="sticky top-0 h-[calc(100vh-200px)] p-3">
                  <AIChatCard
                    activeClause={activeClause}
                    documentType={state.documentType}
                    analysisComplete={state.isComplete}
                    onClose={() => setIsChatOpen(false)}
                    className="w-full h-full shadow-lg"
                  />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Loading State (before first clause) ── */}
      {isLoading && state.clauses.length === 0 && !state.error && (
        <main className="flex-1 max-w-[800px] mx-auto w-full px-4 md:px-8 py-6 pb-[140px]">
          <ClauseList
            clauses={[]}
            isLoading={true}
            isComplete={false}
            onAskAbout={handleAskAbout}
          />
        </main>
      )}

      {/* ── Floating Bottom Dock ── */}
      {(state.clauses.length > 0 || isLoading) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4">
          <Dock items={dockItems} className="py-0" />
        </div>
      )}

      {/* ── Mobile-only Sliding AI Chat Overlay ── */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            {/* Backdrop overlay — mobile only */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-40 md:hidden"
            />
            {/* Sliding Panel — mobile only */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full bg-transparent z-50 p-2 flex items-center justify-end md:hidden"
            >
              <AIChatCard
                activeClause={activeClause}
                documentType={state.documentType}
                analysisComplete={state.isComplete}
                onClose={() => setIsChatOpen(false)}
                className="w-full h-full shadow-2xl"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
