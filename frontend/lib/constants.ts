/**
 * ClearSign v1.0 — Constants
 *
 * Per TRD §4.2 / UX Brief §6.2 — Centralised constants for MIME types,
 * file size limits, clause type mappings, and UI copy strings.
 * All microcopy is centralised here — never hardcoded in components.
 */

import type { ClauseType } from "@/types";

// ── File Upload ──

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ACCEPTED_EXTENSIONS = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
} as const;

export const MAX_FILE_SIZE_MB = parseInt(
  process.env.NEXT_PUBLIC_MAX_FILE_MB || "10",
  10
);

export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ── API ──

// Production: set NEXT_PUBLIC_API_URL="" on Vercel to use same-origin /api proxy.
// Local dev: defaults to http://localhost:8000 when unset.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL === ""
    ? ""
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Clause Type Colours (UX Brief §6.2) ──

export const CLAUSE_TYPE_COLOURS: Record<ClauseType, string> = {
  payment: "#2563EB",        // Blue
  termination: "#DC2626",    // Red
  penalty_liability: "#D97706", // Amber
  notice_period: "#7C3AED",  // Purple
  confidentiality: "#0891B2", // Teal
  jurisdiction: "#4F46E5",   // Indigo
  non_standard: "#EA580C",   // Orange
  standard: "#6B7280",       // Gray
};

export const CLAUSE_TYPE_BG_COLOURS: Record<ClauseType, string> = {
  payment: "#DBEAFE",
  termination: "#FEE2E2",
  penalty_liability: "#FEF3C7",
  notice_period: "#EDE9FE",
  confidentiality: "#CFFAFE",
  jurisdiction: "#E0E7FF",
  non_standard: "#FFEDD5",
  standard: "#F3F4F6",
};

export const CLAUSE_TYPE_LABELS: Record<ClauseType, string> = {
  payment: "Payment / Rent",
  termination: "Termination",
  penalty_liability: "Penalty / Liability",
  notice_period: "Notice Period",
  confidentiality: "Confidentiality",
  jurisdiction: "Jurisdiction",
  non_standard: "Non-Standard",
  standard: "Standard",
};

// ── UI Copy (UX Brief §13.2) ──

export const UI_COPY = {
  // Upload page
  APP_NAME: "ClearSign",
  APP_TAGLINE: "Understand Before You Sign.",
  UPLOAD_TITLE: "Drop your document here",
  UPLOAD_SUBTITLE: "or tap to browse your files",
  UPLOAD_BUTTON: "Choose Document",
  UPLOAD_FORMATS: `PDF · DOCX · Max ${MAX_FILE_SIZE_MB} MB`,
  UPLOAD_TRUST: "No account needed. Your document is never stored.",

  // Upload states
  UPLOADING_MESSAGE: "Reading your document...",
  PROCESSING_MESSAGE: "Processing your question...",

  // Analysis page
  DISCLAIMER:
    "ClearSign helps you understand documents. It does not provide legal advice. Consult a qualified lawyer for binding decisions.",
  ANALYSIS_IN_PROGRESS: "Analysing your document...",
  ANALYSIS_COMPLETE: (count: number) =>
    `Analysis complete — ${count} clauses covered`,

  // Q&A
  QA_PLACEHOLDER: "Ask about a clause...",
  QA_ASK_ABOUT: (title: string) =>
    `What does the ${title} clause mean for me?`,
  QA_NOT_FOUND:
    "This document doesn't address that directly. I can only answer from what's in the file.",

  // Error messages
  ERROR_FILE_TOO_LARGE: `This file is over ${MAX_FILE_SIZE_MB} MB. Please use a compressed or smaller version.`,
  ERROR_UNSUPPORTED_TYPE: "Only PDF and DOCX files are accepted.",
  ERROR_NETWORK:
    "Something went wrong while reading your document. Please try again.",
  ERROR_NO_TEXT:
    "We couldn't read any text from this file. Please check it's a text-based PDF or DOCX, not a scanned image.",
  ERROR_LONG_DOCUMENT:
    "Your document is very long. Processing in sections — this may take a moment.",
  ERROR_RATE_LIMIT:
    "Processing is slightly delayed — retrying automatically...",

  // CTAs
  CTA_TRY_AGAIN: "Try Again",
  CTA_TRY_DIFFERENT: "Try a Different File",
  CTA_ASK_CLAUSE: "Ask about this clause →",
} as const;
