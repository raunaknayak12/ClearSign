/**
 * ClearSign v1.0 — SSE Consumer Hook
 *
 * Phase 6.6 — Parses Server-Sent Events from the analysis endpoint.
 * Handles clause, progress, error, and done events to build up
 * the AnalysisState progressively.
 */

"use client";

import { useCallback, useRef, useState } from "react";
import type { AnalysisState, ClauseCard, ProgressData } from "@/types";

export function getDocumentTypeCode(docType: string): string {
  if (!docType) return "DOC";
  const upper = docType.toUpperCase();
  if (upper.includes("NON-DISCLOSURE") || upper.includes("NDA")) return "NDA";
  if (upper.includes("EMPLOYMENT")) return "EMP";
  if (upper.includes("RENTAL") || upper.includes("LEASE")) return "RNT";
  if (upper.includes("SERVICE")) return "SRV";
  const words = docType.split(/\s+/).filter((w) => w.length > 0);
  if (words.length > 1) {
    return words
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4);
  }
  return docType.slice(0, 3).toUpperCase();
}

const INITIAL_STATE: AnalysisState = {
  clauses: [],
  documentType: "",
  documentTypeCode: "",
  pageCount: null,
  fileName: "",
  totalClauses: 0,
  isComplete: false,
  progressPercent: 0,
  progressMessage: "Analysing your document...",
  error: null,
  analysisId: null,
};

/**
 * Parse SSE events from a ReadableStream response body.
 *
 * SSE format: lines starting with "event:", "data:", "id:"
 * separated by double newlines.
 */
async function* parseSSE(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<{ event: string; data: string; id?: string }> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Split on double newlines (SSE event boundary)
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const lines = part.split("\n");
      let event = "";
      let data = "";
      let id: string | undefined;

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          event = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          data = line.slice(6).trim();
        } else if (line.startsWith("id: ")) {
          id = line.slice(4).trim();
        }
      }

      if (event && data) {
        yield { event, data, id };
      }
    }
  }
}

export function useSSE() {
  const [state, setState] = useState<AnalysisState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Start consuming SSE events from a fetch Response.
   * Updates AnalysisState as events arrive.
   */
  const consumeStream = useCallback(
    async (
      response: Response,
      fileMetadata?: { fileName: string; pageCount: number | null }
    ) => {
      // Reset state for new analysis
      setState({
        ...INITIAL_STATE,
        fileName: fileMetadata?.fileName || "",
        pageCount: fileMetadata?.pageCount ?? null,
      });

      if (!response.body) {
        setState((prev) => ({
          ...prev,
          error: "No response body received.",
          isComplete: true,
        }));
        return;
      }

      const reader = response.body.getReader();

      try {
        for await (const sseEvent of parseSSE(reader)) {
          switch (sseEvent.event) {
            case "clause": {
              const clause: ClauseCard = JSON.parse(sseEvent.data);
              clause.risk = clause.risk || (clause.is_non_standard ? "flag" : "standard");
              setState((prev) => ({
                ...prev,
                clauses: [...prev.clauses, clause],
              }));
              break;
            }

            case "progress": {
              const progress: ProgressData = JSON.parse(sseEvent.data);
              setState((prev) => {
                const docType = progress.document_type || prev.documentType;
                return {
                  ...prev,
                  progressPercent: progress.percent,
                  progressMessage: progress.message || prev.progressMessage,
                  documentType: docType,
                  documentTypeCode: getDocumentTypeCode(docType),
                  totalClauses: progress.clauses_received || prev.totalClauses,
                };
              });
              break;
            }

            case "error": {
              const errorData = JSON.parse(sseEvent.data);
              setState((prev) => ({
                ...prev,
                error: errorData.message,
              }));
              break;
            }

            case "done": {
              const doneData = JSON.parse(sseEvent.data);
              setState((prev) => ({
                ...prev,
                isComplete: true,
                analysisId: doneData.analysis_id || null,
                totalClauses: doneData.total_clauses || prev.clauses.length,
                progressPercent: 100,
                progressMessage: `Analysis complete — ${
                  doneData.total_clauses || prev.clauses.length
                } clauses covered`,
              }));
              break;
            }
          }
        }
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: "Connection lost. Please try again.",
          isComplete: true,
        }));
      }
    },
    []
  );

  /**
   * Reset analysis state to initial values.
   */
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(INITIAL_STATE);
  }, []);

  /**
   * Load a pre-analyzed document from cached data.
   */
  const loadAnalysis = useCallback((
    analysisId: string,
    documentType: string,
    clauses: ClauseCard[]
  ) => {
    setState({
      clauses: clauses.map(c => ({
        ...c,
        risk: c.risk || (c.is_non_standard ? "flag" : "standard")
      })),
      documentType,
      documentTypeCode: getDocumentTypeCode(documentType),
      pageCount: null,
      fileName: `${documentType.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.pdf`,
      totalClauses: clauses.length,
      isComplete: true,
      progressPercent: 100,
      progressMessage: `Analysis loaded — ${clauses.length} clauses covered`,
      error: null,
      analysisId,
    });
  }, []);

  return { state, consumeStream, reset, loadAnalysis };
}
