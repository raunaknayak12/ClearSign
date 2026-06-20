/**
 * ClearSign v1.0 — Home Page (Hero + Upload)
 *
 * Route: /
 * Animated hero with word-by-word title reveal, feature cards,
 * and a modern file upload section.
 *
 * On file selection: store file and navigate to /analyse immediately.
 */

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { ClearSignHero } from "@/components/ui/myna-hero";
import DropZone from "@/components/upload/DropZone";
import { useFileUpload } from "@/hooks/useFileUpload";
import { UI_COPY } from "@/lib/constants";
import { setPendingFile } from "@/lib/fileStore";
import { motion } from "framer-motion";

export default function HomePage() {
  const router = useRouter();
  const { uploadState, error, selectedFile, reset } = useFileUpload();
  const uploadRef = useRef<HTMLDivElement>(null);

  const handleFileSelected = useCallback(
    async (file: File) => {
      // Store file reference for the analyse page
      setPendingFile(file);
      // Navigate immediately — upload happens on the analyse page
      router.push("/analyse");
    },
    [router]
  );

  const scrollToUpload = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <main className="min-h-screen bg-transparent flex flex-col">
      {/* ── Skip Link ── */}
      <a
        href="#file-upload-input"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 
                   focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg
                   focus:shadow-lg focus:text-[#4F6EF7] focus:outline-2 focus:outline-[#4F6EF7]"
      >
        Skip to upload
      </a>

      {/* ── Hero Section ── */}
      <ClearSignHero onGetStarted={scrollToUpload} />

      {/* ── Upload Section ── */}
      <section
        id="upload-section"
        ref={uploadRef}
        className="py-16 md:py-20 bg-transparent"
      >
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 80, damping: 15 }}
            className="max-w-[560px] mx-auto space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground font-mono">
                Start Your Analysis
              </h2>
              <p className="text-sm text-muted-foreground font-mono">
                Upload your document and get insights in seconds
              </p>
            </div>

            {/* Drop Zone */}
            <DropZone
              uploadState={uploadState}
              error={error}
              selectedFile={selectedFile}
              onFileSelected={handleFileSelected}
              onReset={reset}
            />

            {/* Trust indicator */}
            <p className="text-center text-xs text-slate-400 font-mono">
              {UI_COPY.UPLOAD_TRUST}
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
