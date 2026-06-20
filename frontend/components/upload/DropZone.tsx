/**
 * ClearSign v1.0 — DropZone Component (Redesigned)
 *
 * Modern card-based upload UI with animated states.
 * States: idle → drag-over → uploading → error
 * On file drop → immediate redirect to /analyse (no file list).
 *
 * Touch targets ≥ 44×44px per WCAG 2.5.5.
 */

"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  AlertCircle,
  Loader2,
  CloudUpload,
} from "lucide-react";
import type { UploadState } from "@/types";
import { ACCEPTED_EXTENSIONS, UI_COPY } from "@/lib/constants";
import { Button } from "@/components/ui/button";

interface DropZoneProps {
  uploadState: UploadState;
  error: string | null;
  selectedFile: File | null;
  onFileSelected: (file: File) => void;
  onReset: () => void;
}

export default function DropZone({
  uploadState,
  error,
  selectedFile,
  onFileSelected,
  onReset,
}: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelected(acceptedFiles[0]);
      }
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_EXTENSIONS,
    maxFiles: 1,
    multiple: false,
    disabled: uploadState === "uploading" || uploadState === "streaming",
  });

  const isProcessing =
    uploadState === "uploading" || uploadState === "streaming";

  return (
    <div
      {...getRootProps()}
      className={`
        group relative overflow-hidden rounded-2xl border-2 border-dashed
        transition-all duration-300 ease-out cursor-pointer
        min-h-[240px] flex flex-col items-center justify-center gap-5
        px-8 py-12 text-center
        ${
          uploadState === "error"
            ? "border-red-400 bg-red-50/80 backdrop-blur-sm"
            : isProcessing
            ? "border-[#2C5EE8]/50 bg-[#2C5EE8]/5 backdrop-blur-sm"
            : isDragActive
            ? "border-[#2C5EE8] bg-[#2C5EE8]/10 scale-[1.02] backdrop-blur-sm"
            : "border-slate-300/80 bg-white/60 backdrop-blur-sm hover:border-[#2C5EE8]/60 hover:bg-white/80"
        }
      `}
      role="button"
      aria-label="Upload document"
      tabIndex={0}
    >
      <input {...getInputProps()} id="file-upload-input" />

      {/* Subtle gradient overlay on hover */}
      <div
        className={`absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none
          ${!isProcessing && !error ? "group-hover:opacity-100" : ""}
        `}
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(44,94,232,0.04) 0%, transparent 70%)",
        }}
      />

      {/* ── Processing State ── */}
      {isProcessing && (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#2C5EE8]/20 animate-ping" />
            <Loader2 className="h-12 w-12 text-[#2C5EE8] animate-spin relative z-10" />
          </div>
          <p className="text-base font-semibold text-slate-800">
            {UI_COPY.UPLOADING_MESSAGE}
          </p>
          {selectedFile && (
            <p className="text-sm font-mono text-slate-500">
              {selectedFile.name}
            </p>
          )}
        </div>
      )}

      {/* ── Error State ── */}
      {uploadState === "error" && (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <p className="text-base font-semibold text-red-700">{error}</p>
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className="mt-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 min-h-[44px]"
            aria-label="Try again"
          >
            {UI_COPY.CTA_TRY_AGAIN}
          </Button>
        </div>
      )}

      {/* ── Drag Active State ── */}
      {!isProcessing && uploadState !== "error" && isDragActive && (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="rounded-full bg-[#2C5EE8]/10 p-4">
            <FileText className="h-12 w-12 text-[#2C5EE8]" />
          </div>
          <p className="text-lg font-semibold text-[#2C5EE8]">
            Drop your file here
          </p>
        </div>
      )}

      {/* ── Default Idle State ── */}
      {!isProcessing &&
        uploadState !== "error" &&
        !isDragActive && (
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="rounded-full bg-slate-100 p-4 group-hover:bg-[#2C5EE8]/10 transition-colors duration-300">
              <CloudUpload className="h-10 w-10 text-slate-400 group-hover:text-[#2C5EE8] transition-colors duration-300" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">
                {UI_COPY.UPLOAD_TITLE}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {UI_COPY.UPLOAD_SUBTITLE}
              </p>
            </div>

            {/* File type badges */}
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200/60 px-3 py-1 text-xs font-medium text-red-600">
                <FileText className="h-3 w-3" />
                PDF
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-xs font-medium text-blue-600">
                <FileText className="h-3 w-3" />
                DOCX
              </span>
              <span className="text-xs text-slate-400 ml-1">
                Max {UI_COPY.UPLOAD_FORMATS.split("Max ")[1]}
              </span>
            </div>

            <Button
              type="button"
              className="mt-2 bg-[#2C5EE8] hover:bg-[#2C5EE8]/90 text-white font-semibold rounded-lg min-h-[44px] px-8"
              aria-label="Choose document to upload"
            >
              <Upload className="h-4 w-4 mr-2" />
              {UI_COPY.UPLOAD_BUTTON}
            </Button>
          </div>
        )}
    </div>
  );
}
