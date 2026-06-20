/**
 * ClearSign v1.0 — TypeScript Type Definitions
 *
 * Per TRD §4.2 — Mirrors backend Pydantic models with camelCase field names.
 * These types govern the entire frontend data flow.
 */

// ── Clause Types ──

export type ClauseType =
  | "payment"
  | "termination"
  | "penalty_liability"
  | "notice_period"
  | "confidentiality"
  | "jurisdiction"
  | "non_standard"
  | "standard";

export type RiskLevel = "standard" | "review" | "flag";

// ── Clause Card ──

export interface ClauseCard {
  clause_id: string;
  clause_title: string;
  clause_type: ClauseType;
  original_text: string;
  explanation: string;
  is_non_standard: boolean;
  grounding_statement: string | null;
  risk: RiskLevel;
}

// ── Q&A ──

export interface QARequest {
  question: string;
  clause_text: string;
  clause_title: string;
  document_type: string;
}

export interface QAResponse {
  answer: string;
  answer_found: boolean;
  source_clause_id: string;
}

// ── SSE Events ──

export type SSEEventType = "clause" | "progress" | "error" | "done" | "token" | "answer";

export interface SSEEvent {
  event: SSEEventType;
  data: string;
  id?: string;
}

export interface ProgressData {
  percent: number;
  message?: string;
  document_type?: string;
  confidence?: number;
  clauses_received?: number;
}

// ── Upload State Machine ──

export type UploadState = "idle" | "uploading" | "streaming" | "complete" | "error";

// ── Analysis State ──

export interface AnalysisState {
  clauses: ClauseCard[];
  documentType: string;
  documentTypeCode: string;
  pageCount: number | null;
  fileName: string;
  totalClauses: number;
  isComplete: boolean;
  progressPercent: number;
  progressMessage: string;
  error: string | null;
}

// ── Q&A History ──

export interface QAHistoryItem {
  question: string;
  answer: string;
  answerFound: boolean;
  clauseId: string;
  clauseTitle: string;
}
