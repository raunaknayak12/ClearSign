/**
 * ClearSign v1.0 — Q&A Panel Component
 *
 * Phase 7.1 — Inline Q&A flow container.
 * - Renders directly below the clause list
 * - Input text field with hint
 * - AI response cards styled with bg-[#E0E7FF] and left border accent
 * - Progressive streaming text reveal for responses
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, ArrowUp, Loader2 } from "lucide-react";
import { askQuestion, APIError } from "@/lib/api";
import { UI_COPY } from "@/lib/constants";
import type { ClauseCard } from "@/types";
import { cn } from "@/lib/utils";

interface MessageItem {
  sender: "ai" | "user";
  text: string;
  clauseTitle?: string;
}

interface QAPanelProps {
  activeClause: ClauseCard | null;
  documentType: string;
  analysisComplete: boolean;
}

export default function QAPanel({
  activeClause,
  documentType,
  analysisComplete,
}: QAPanelProps) {
  const [messages, setMessages] = useState<MessageItem[]>([
    { sender: "ai", text: "👋 Hello! I'm your AI assistant. Select a clause above or ask any questions." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-fill and focus when activeClause changes
  useEffect(() => {
    if (activeClause) {
      setInput(UI_COPY.QA_ASK_ABOUT(activeClause.clause_title));
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [activeClause]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setStreamingAnswer("");

    // Add user message to history
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setIsTyping(true);

    // Use activeClause if available, otherwise fallback to standard values
    const contextText = activeClause ? activeClause.original_text : "";
    const contextTitle = activeClause ? activeClause.clause_title : "General";

    try {
      const response = await askQuestion({
        question: userMessage,
        clause_text: contextText,
        clause_title: contextTitle,
        document_type: documentType,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalAnswer = "";

      setIsTyping(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          let event = "";
          let data = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            else if (line.startsWith("data: ")) data = line.slice(6).trim();
          }

          if (event === "token" && data) {
            const tokenData = JSON.parse(data);
            setStreamingAnswer((prev) => prev + tokenData.token);
          } else if (event === "answer" && data) {
            const answerData = JSON.parse(data);
            finalAnswer = answerData.answer;
          }
        }
      }

      // Add final answer to history
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: finalAnswer || streamingAnswer,
          clauseTitle: activeClause?.clause_title,
        },
      ]);
      setStreamingAnswer("");
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: err instanceof APIError ? err.message : "Something went wrong. Please try again.",
        },
      ]);
      setStreamingAnswer("");
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 w-full flex flex-col space-y-4">
      {/* Messages List */}
      <div className="flex flex-col gap-3 min-h-[60px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "p-4 rounded-xl shadow-sm text-sm transition-all duration-300",
              msg.sender === "ai"
                ? "bg-[#E0E7FF] border-l-4 border-[#2C5EE8] text-slate-800 self-start rounded-tl-none max-w-[95%] w-full"
                : "bg-slate-100 border border-slate-200 text-slate-700 self-end rounded-tr-none max-w-[85%]"
            )}
          >
            <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
            {msg.clauseTitle && (
              <span className="inline-block text-[9px] text-[#2C5EE8] mt-1.5 font-semibold bg-white/60 px-1.5 py-0.5 rounded border border-[#2C5EE8]/20">
                Re: {msg.clauseTitle}
              </span>
            )}
          </div>
        ))}

        {/* Streaming Answer card */}
        {streamingAnswer && (
          <div className="p-4 rounded-xl shadow-sm text-sm bg-[#E0E7FF] border-l-4 border-[#2C5EE8] text-slate-800 self-start rounded-tl-none max-w-[95%] w-full">
            <p className="leading-relaxed">
              {streamingAnswer}
              <span className="inline-block w-1.5 h-3 bg-[#2C5EE8] ml-0.5 animate-pulse" />
            </p>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !streamingAnswer && (
          <div className="flex items-center gap-1.5 p-3 rounded-lg bg-[#E0E7FF] border-l-4 border-[#2C5EE8] self-start rounded-tl-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2C5EE8] animate-pulse"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#2C5EE8] animate-pulse [animation-delay:0.2s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#2C5EE8] animate-pulse [animation-delay:0.4s]"></span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border border-[#E2E8F0] rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center gap-3 px-4 py-3">
        <MessageCircle className="w-4 h-4 text-[#9CA3AF] shrink-0" />
        <div className="flex-1 flex flex-col min-w-0">
          <input
            ref={inputRef}
            type="text"
            className="text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none w-full bg-transparent border-0 p-0 focus:ring-0"
            placeholder="Ask anything about this document…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading || !analysisComplete}
          />
          <span className="text-[11px] text-[#9CA3AF] hidden sm:block mt-0.5 select-none">
            {activeClause ? `Context: ${activeClause.clause_title}` : 'e.g. "Is there a penalty clause?"'}
          </span>
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="w-[28px] h-[28px] flex items-center justify-center rounded-md bg-[#111827] text-white hover:bg-[#1A3DA8] transition-colors shrink-0 disabled:opacity-40"
          aria-label="Send question"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowUp className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
