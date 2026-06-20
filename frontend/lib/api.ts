/**
 * ClearSign v1.0 — Typed API Client
 *
 * Phase 7.6 — Typed fetch wrappers for all backend endpoints.
 * Base URL from NEXT_PUBLIC_API_URL environment variable.
 */

import { API_BASE_URL } from "./constants";
import type { QARequest } from "@/types";

/**
 * Upload a document for AI analysis.
 *
 * Sends the file as multipart/form-data to POST /api/v1/analyse.
 * Returns the raw Response for SSE stream consumption.
 *
 * @param file - The PDF or DOCX file to analyse.
 * @returns Raw fetch Response (text/event-stream).
 */
export async function analyseDocument(file: File): Promise<Response> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/v1/analyse`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok && response.status !== 200) {
    const errorData = await response.json().catch(() => null);
    const message =
      errorData?.detail ||
      "Something went wrong while reading your document. Please try again.";
    throw new APIError(message, response.status);
  }

  return response;
}

/**
 * Ask a question about a specific clause.
 *
 * Sends the question + clause context to POST /api/v1/qa.
 * Returns the raw Response for SSE stream consumption.
 *
 * @param request - QARequest with question, clause context, and doc type.
 * @returns Raw fetch Response (text/event-stream).
 */
export async function askQuestion(request: QARequest): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}/api/v1/qa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok && response.status !== 200) {
    const errorData = await response.json().catch(() => null);
    const message =
      errorData?.detail ||
      "Something went wrong while processing your question. Please try again.";
    throw new APIError(message, response.status);
  }

  return response;
}

/**
 * Custom error class for API errors with status codes.
 */
export class APIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "APIError";
    this.status = status;
  }
}
