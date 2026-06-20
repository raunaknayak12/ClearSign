"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Send, X, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ClauseCard } from "@/types"
import { askQuestion, APIError } from "@/lib/api"
import { UI_COPY } from "@/lib/constants"

// ── ColorOrb Component (for collapsed trigger pill) ──

interface OrbProps {
  dimension?: string
  className?: string
  tones?: {
    base?: string
    accent1?: string
    accent2?: string
    accent3?: string
  }
  spinDuration?: number
}

const ColorOrb: React.FC<OrbProps> = ({
  dimension = "192px",
  className,
  tones,
  spinDuration = 20,
}) => {
  const fallbackTones = {
    base: "oklch(95% 0.02 264.695)",
    accent1: "oklch(75% 0.15 350)",
    accent2: "oklch(80% 0.12 200)",
    accent3: "oklch(78% 0.14 280)",
  }

  const palette = { ...fallbackTones, ...tones }
  const dimValue = parseInt(dimension.replace("px", ""), 10)

  const blurStrength =
    dimValue < 50 ? Math.max(dimValue * 0.008, 1) : Math.max(dimValue * 0.015, 4)

  const contrastStrength =
    dimValue < 50 ? Math.max(dimValue * 0.004, 1.2) : Math.max(dimValue * 0.008, 1.5)

  const pixelDot = dimValue < 50 ? Math.max(dimValue * 0.004, 0.05) : Math.max(dimValue * 0.008, 0.1)
  const shadowRange = dimValue < 50 ? Math.max(dimValue * 0.004, 0.5) : Math.max(dimValue * 0.008, 2)
  const maskRadius =
    dimValue < 30 ? "0%" : dimValue < 50 ? "5%" : dimValue < 100 ? "15%" : "25%"

  const adjustedContrast =
    dimValue < 30 ? 1.1 : dimValue < 50 ? Math.max(contrastStrength * 1.2, 1.3) : contrastStrength

  return (
    <div
      className={cn("color-orb", className)}
      style={{
        width: dimension,
        height: dimension,
        "--base": palette.base,
        "--accent1": palette.accent1,
        "--accent2": palette.accent2,
        "--accent3": palette.accent3,
        "--spin-duration": `${spinDuration}s`,
        "--blur": `${blurStrength}px`,
        "--contrast": adjustedContrast,
        "--dot": `${pixelDot}px`,
        "--shadow": `${shadowRange}px`,
        "--mask": maskRadius,
      } as React.CSSProperties}
    >
      <style jsx>{`
        @property --angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .color-orb {
          display: grid;
          grid-template-areas: "stack";
          overflow: hidden;
          border-radius: 50%;
          position: relative;
          transform: scale(1.1);
        }

        .color-orb::before,
        .color-orb::after {
          content: "";
          display: block;
          grid-area: stack;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          transform: translateZ(0);
        }

        .color-orb::before {
          background:
            conic-gradient(
              from calc(var(--angle) * 2) at 25% 70%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 45% 75%,
              var(--accent2),
              transparent 30% 60%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * -3) at 80% 20%,
              var(--accent1),
              transparent 40% 60%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 15% 5%,
              var(--accent2),
              transparent 10% 90%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * 1) at 20% 80%,
              var(--accent1),
              transparent 10% 90%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * -2) at 85% 10%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            );
          box-shadow: inset var(--base) 0 0 var(--shadow) calc(var(--shadow) * 0.2);
          filter: blur(var(--blur)) contrast(var(--contrast));
          animation: spin var(--spin-duration) linear infinite;
        }

        .color-orb::after {
          background-image: radial-gradient(
            circle at center,
            var(--base) var(--dot),
            transparent var(--dot)
          );
          background-size: calc(var(--dot) * 2) calc(var(--dot) * 2);
          backdrop-filter: blur(calc(var(--blur) * 2)) contrast(calc(var(--contrast) * 2));
          mix-blend-mode: overlay;
        }

        .color-orb[style*="--mask: 0%"]::after {
          mask-image: none;
        }

        .color-orb:not([style*="--mask: 0%"])::after {
          mask-image: radial-gradient(black var(--mask), transparent 75%);
        }

        @keyframes spin {
          to {
            --angle: 360deg;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .color-orb::before {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

// ── MorphPanel (AIChatCard minimal styled) ──

interface MessageItem {
  sender: "ai" | "user"
  text: string
  clauseTitle?: string
}

interface MorphPanelProps {
  activeClause: ClauseCard | null
  documentType: string
  analysisComplete: boolean
}

export function MorphPanel({ activeClause, documentType, analysisComplete }: MorphPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<MessageItem[]>([
    { sender: "ai", text: "👋 Hello! I’m your AI assistant." },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [streamingAnswer, setStreamingAnswer] = useState("")
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), [])

  // Auto-open and pre-fill when activeClause changes
  useEffect(() => {
    if (activeClause) {
      setInput(UI_COPY.QA_ASK_ABOUT(activeClause.clause_title))
      setIsOpen(true)
    }
  }, [activeClause])

  // Scroll to bottom of messages programmatically to prevent page shifting
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [messages, streamingAnswer, isTyping])

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeClause) return

    const userMessage = input.trim()
    setInput("")
    setIsLoading(true)
    setStreamingAnswer("")

    // Add user message to history
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }])
    setIsTyping(true)

    try {
      const response = await askQuestion({
        question: userMessage,
        clause_text: activeClause.original_text,
        clause_title: activeClause.clause_title,
        document_type: documentType,
      })

      if (!response.body) throw new Error("No response body")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let finalAnswer = ""

      setIsTyping(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() || ""

        for (const part of parts) {
          const lines = part.split("\n")
          let event = ""
          let data = ""

          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7).trim()
            else if (line.startsWith("data: ")) data = line.slice(6).trim()
          }

          if (event === "token" && data) {
            const tokenData = JSON.parse(data)
            setStreamingAnswer((prev) => prev + tokenData.token)
          } else if (event === "answer" && data) {
            const answerData = JSON.parse(data)
            finalAnswer = answerData.answer
          }
        }
      }

      // Add final answer to history
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: finalAnswer || streamingAnswer,
          clauseTitle: activeClause.clause_title,
        },
      ])
      setStreamingAnswer("")
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: err instanceof APIError ? err.message : "Something went wrong. Please try again.",
        },
      ])
      setStreamingAnswer("")
      setIsTyping(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 select-none">
      <AnimatePresence>
        {isOpen && (
          <div className="relative w-[360px] h-[460px] rounded-2xl overflow-hidden p-[1px] shadow-2xl bg-white/10 border border-white/20 backdrop-blur-xl">
            {/* Animated Outer Border (Website Colors) */}
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-white/20"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            />

            {/* Inner Card */}
            <div className="relative flex flex-col w-full h-full rounded-xl overflow-hidden bg-white/30 backdrop-blur-xl">
              {/* Inner Animated Background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/10"
                animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: "200% 200%" }}
              />

              {/* Floating Particles */}
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-[#2C5EE8]/10"
                  animate={{
                    y: ["0%", "-140%"],
                    x: [Math.random() * 200 - 100, Math.random() * 200 - 100],
                    opacity: [0, 0.8, 0],
                  }}
                  transition={{
                    duration: 5 + Math.random() * 3,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: "easeInOut",
                  }}
                  style={{ left: `${Math.random() * 100}%`, bottom: "-10%" }}
                />
              ))}

              {/* Header */}
              <div className="px-4 py-3 border-b border-white/20 relative z-10 flex items-center bg-white/20 backdrop-blur-md shrink-0">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span>🤖</span> AI Assistant
                </h2>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 min-h-0 px-4 py-3 overflow-y-auto space-y-3 text-xs flex flex-col relative z-10"
              >
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={cn(
                      "px-3.5 py-2.5 rounded-2xl max-w-[80%] shadow-sm border backdrop-blur-sm",
                      msg.sender === "ai"
                        ? "bg-white/60 border-white/30 text-slate-800 self-start rounded-tl-none"
                        : "bg-[#2C5EE8]/80 border-[#2C5EE8]/40 text-white self-end rounded-tr-none"
                    )}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    {msg.clauseTitle && (
                      <span className="inline-block text-[9px] text-[#2C5EE8] mt-1.5 font-medium bg-white/40 px-1 rounded border border-white/20">
                        Re: {msg.clauseTitle}
                      </span>
                    )}
                  </motion.div>
                ))}

                {/* Streaming Answer */}
                {streamingAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-3.5 py-2.5 rounded-2xl max-w-[80%] shadow-sm border bg-white/60 border-white/30 text-slate-800 self-start rounded-tl-none backdrop-blur-sm"
                  >
                    <p className="leading-relaxed">
                      {streamingAnswer}
                      <span className="inline-block w-1.5 h-3 bg-[#2C5EE8] ml-0.5 animate-pulse" />
                    </p>
                  </motion.div>
                )}

                {/* AI Typing Indicator */}
                {isTyping && !streamingAnswer && (
                  <motion.div
                    className="flex items-center gap-1 px-3 py-2 rounded-xl max-w-[30%] bg-white/30 border border-white/20 self-start rounded-tl-none backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.6, 1, 0.6, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2C5EE8]/60 animate-pulse"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2C5EE8]/60 animate-pulse delay-200"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2C5EE8]/60 animate-pulse delay-400"></span>
                  </motion.div>
                )}
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 p-3 border-t border-white/20 relative z-10 bg-white/25 backdrop-blur-md shrink-0">
                <input
                  className="flex-1 px-4 py-2 text-xs bg-white/30 rounded-full border border-white/30 text-slate-800 placeholder:text-slate-500 focus:outline-none focus:border-[#2C5EE8]/80 focus:ring-1 focus:ring-[#2C5EE8]/80"
                  placeholder={
                    activeClause
                      ? "Type a message..."
                      : "Select a clause to ask..."
                  }
                  value={input}
                  disabled={isLoading || !analysisComplete}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || !activeClause}
                  className="p-2 rounded-full bg-[#2C5EE8] hover:bg-[#1A3DA8] text-white disabled:opacity-40 transition-colors shadow-sm"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Collapsed Trigger Pill Button ── */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={toggleOpen}
        className={cn(
          "cursor-pointer border select-none transition-all duration-300 flex items-center shadow-lg pointer-events-auto",
          isOpen
            ? "h-14 w-14 rounded-full bg-[#DC2626] border-[#DC2626] text-white justify-center"
            : "h-12 bg-white border-slate-200/80 rounded-full px-4 gap-2.5 justify-start text-slate-800"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white rotate-90 transition-transform duration-300" />
        ) : (
          <>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#2C5EE8]" />
            ) : (
              <ColorOrb dimension="24px" tones={{ base: "oklch(22.64% 0 0)" }} />
            )}
            <span className="text-xs font-semibold text-slate-700 tracking-wide">
              {activeClause ? "Ask AI" : "Select a clause..."}
            </span>
          </>
        )}
      </motion.div>
    </div>
  )
}

export default MorphPanel
