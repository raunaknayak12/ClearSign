"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, MessageCircle, Loader2, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { askQuestion, APIError } from "@/lib/api";
import type { ClauseCard } from "@/types";

interface MessageItem {
  sender: "ai" | "user";
  text: string;
  clauseTitle?: string;
}

interface AIChatCardProps {
  className?: string;
  activeClause: ClauseCard | null;
  documentType: string;
  analysisComplete: boolean;
  onClose?: () => void;
}

function renderMessageText(text: string) {
  const htmlLinkRegex = /<a\s+href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/i;
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/i;
  const boldRegex = /\*\*([^*]+)\*\*/i;

  let currentText = text;
  const elements: React.ReactNode[] = [];
  let key = 0;

  while (currentText) {
    const htmlMatch = htmlLinkRegex.exec(currentText);
    const mdMatch = mdLinkRegex.exec(currentText);
    const boldMatch = boldRegex.exec(currentText);

    let firstMatch = null;
    let matchType: "html" | "md" | "bold" = "html";

    if (htmlMatch) {
      firstMatch = htmlMatch;
      matchType = "html";
    }

    if (mdMatch) {
      if (!firstMatch || mdMatch.index < firstMatch.index) {
        firstMatch = mdMatch;
        matchType = "md";
      }
    }

    if (boldMatch) {
      if (!firstMatch || boldMatch.index < firstMatch.index) {
        firstMatch = boldMatch;
        matchType = "bold";
      }
    }

    if (!firstMatch) {
      elements.push(<span key={key++}>{currentText}</span>);
      break;
    }

    const index = firstMatch.index;
    if (index > 0) {
      elements.push(<span key={key++}>{currentText.substring(0, index)}</span>);
    }

    if (matchType === "html") {
      const href = firstMatch[1];
      const linkText = firstMatch[2];
      elements.push(
        <a
          key={key++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#2C5EE8] hover:underline font-bold break-all"
        >
          {linkText}
        </a>
      );
    } else if (matchType === "md") {
      const linkText = firstMatch[1];
      const href = firstMatch[2];
      elements.push(
        <a
          key={key++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#2C5EE8] hover:underline font-bold break-all"
        >
          {linkText}
        </a>
      );
    } else if (matchType === "bold") {
      const boldText = firstMatch[1];
      elements.push(
        <strong key={key++} className="font-bold text-slate-900">
          {boldText}
        </strong>
      );
    }

    currentText = currentText.substring(index + firstMatch[0].length);
  }

  return elements.length > 0 ? elements : text;
}

export default function AIChatCard({
  className,
  activeClause,
  documentType,
  analysisComplete,
  onClose,
}: AIChatCardProps) {
  const [messages, setMessages] = useState<MessageItem[]>([
    { sender: "ai", text: "👋 Hello! I’m your AI assistant. Select a clause or ask any questions." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages list
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, streamingAnswer, isTyping]);

  // Focus when activeClause changes (without pre-filling suggestions)
  useEffect(() => {
    if (activeClause) {
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
    <div className={cn("relative w-full h-full overflow-hidden p-[2px] font-mono", className)}>
      {/* Animated Outer Border (Translucent slate border) */}
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 border-[#2C5EE8]/10"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />

      {/* Inner Card (Light glassmorphic) */}
      <div className="relative flex flex-col w-full h-full rounded-xl border border-slate-200/50 overflow-hidden bg-white/80 backdrop-blur-xl shadow-2xl">
        {/* Inner Animated Light Gradient Background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100/80 -z-10"
          animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ backgroundSize: "200% 200%" }}
        />

        {/* Floating Light Blue Particles */}
        {Array.from({ length: 15 }).map((_, i) => {
          const delay = i * 0.4;
          const duration = 6 + (i % 5);
          const xOffset = (i * 7) % 50 - 25;
          return (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-[#2C5EE8]/10 pointer-events-none"
              animate={{
                y: ["0%", "-140%"],
                x: [xOffset, -xOffset],
                opacity: [0, 0.7, 0],
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                delay: delay,
                ease: "easeInOut",
              }}
              style={{ left: `${(i * 17) % 100}%`, bottom: "-5%" }}
            />
          );
        })}

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200/60 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-[#2C5EE8]/10 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-[#2C5EE8]" />
            </span>
            <h2 className="text-sm font-bold text-slate-800">AI Assistant</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 px-4 py-3 overflow-y-auto space-y-3 text-xs flex flex-col relative z-10"
        >
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={cn(
                "px-3 py-2.5 rounded-xl max-w-[85%] shadow-sm",
                msg.sender === "ai"
                  ? "bg-slate-100/90 text-slate-800 border border-slate-200/50 self-start rounded-tl-none"
                  : "bg-[#2C5EE8]/10 text-[#1A3DA8] border border-[#2C5EE8]/20 font-semibold self-end rounded-tr-none"
              )}
            >
              <p className="leading-relaxed whitespace-pre-line">{renderMessageText(msg.text)}</p>
              {msg.clauseTitle && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="inline-block text-[9px] text-[#2C5EE8] font-bold bg-white/80 px-1.5 py-0.5 rounded border border-[#2C5EE8]/20">
                    Re: {msg.clauseTitle}
                  </span>
                </div>
              )}
            </motion.div>
          ))}

          {/* Streaming Answer card */}
          {streamingAnswer && (
            <div className="px-3 py-2.5 rounded-xl max-w-[85%] shadow-sm bg-slate-100/90 text-slate-800 border border-slate-200/50 self-start rounded-tl-none">
              <p className="leading-relaxed whitespace-pre-line">
                {renderMessageText(streamingAnswer)}
                <span className="inline-block w-1.5 h-3 bg-[#2C5EE8] ml-0.5 animate-pulse" />
              </p>
            </div>
          )}

          {/* AI Typing Indicator */}
          {isTyping && !streamingAnswer && (
            <motion.div
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100/90 border border-slate-200/50 self-start rounded-tl-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#2C5EE8] animate-pulse"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2C5EE8] animate-pulse [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2C5EE8] animate-pulse [animation-delay:0.4s]"></span>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="flex flex-col gap-1.5 p-3 border-t border-slate-200/60 relative z-10 bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              id="qa-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="flex-1 px-3 py-2 text-xs bg-white rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2C5EE8] focus:border-[#2C5EE8]"
              placeholder="Ask anything about this document..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isLoading || !analysisComplete}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-lg bg-[#2C5EE8] hover:bg-[#2C5EE8]/90 text-white transition-colors disabled:opacity-40"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {activeClause && (
            <span className="text-[10px] text-slate-400 select-none px-1">
              Context: {activeClause.clause_title}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
