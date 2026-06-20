/**
 * ClearSign v1.0 — File Upload Hook
 *
 * Phase 4.6 — State machine for file upload flow:
 * idle → uploading → streaming → complete | error
 *
 * Handles client-side validation, API upload, and SSE stream initiation.
 */

"use client";

import { useCallback, useState } from "react";
import type { UploadState } from "@/types";
import { analyseDocument, APIError } from "@/lib/api";
import {
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  UI_COPY,
} from "@/lib/constants";

interface UseFileUploadReturn {
  uploadState: UploadState;
  error: string | null;
  selectedFile: File | null;
  uploadFile: (file: File) => Promise<Response | null>;
  reset: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  /**
   * Validate and upload a file.
   *
   * Performs client-side validation first (MIME type + file size),
   * then sends to the backend. Returns the Response for SSE consumption.
   */
  const uploadFile = useCallback(async (file: File): Promise<Response | null> => {
    setError(null);
    setSelectedFile(file);

    // ── Client-side MIME type validation ──
    if (
      !ACCEPTED_MIME_TYPES.includes(
        file.type as (typeof ACCEPTED_MIME_TYPES)[number]
      )
    ) {
      setError(UI_COPY.ERROR_UNSUPPORTED_TYPE);
      setUploadState("error");
      return null;
    }

    // ── Client-side file size validation ──
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(UI_COPY.ERROR_FILE_TOO_LARGE);
      setUploadState("error");
      return null;
    }

    // ── Upload to backend ──
    setUploadState("uploading");

    try {
      const response = await analyseDocument(file);
      setUploadState("streaming");
      return response;
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 413) {
          setError(UI_COPY.ERROR_FILE_TOO_LARGE);
        } else if (err.status === 415) {
          setError(UI_COPY.ERROR_UNSUPPORTED_TYPE);
        } else {
          setError(err.message || UI_COPY.ERROR_NETWORK);
        }
      } else {
        setError(UI_COPY.ERROR_NETWORK);
      }
      setUploadState("error");
      return null;
    }
  }, []);

  /**
   * Reset upload state to idle.
   */
  const reset = useCallback(() => {
    setUploadState("idle");
    setError(null);
    setSelectedFile(null);
  }, []);

  return { uploadState, error, selectedFile, uploadFile, reset };
}
