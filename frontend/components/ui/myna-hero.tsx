"use client";

import * as React from "react";
import Image from "next/image";
import {
  ArrowRight,
  FileSearch,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  Zap,
  Eye,
} from "lucide-react";
import { motion, useAnimation, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";

const labels = [
  { icon: Sparkles, label: "AI-Powered Analysis" },
  { icon: Eye, label: "Plain Language" },
  { icon: Zap, label: "Instant Results" },
];

const features = [
  {
    icon: FileSearch,
    label: "Clause Breakdown",
    description:
      "Every clause extracted and explained in plain language you can actually understand.",
  },
  {
    icon: AlertTriangle,
    label: "Risk Detection",
    description:
      "Non-standard and potentially risky clauses are flagged automatically so nothing slips through.",
  },
  {
    icon: MessageSquare,
    label: "Smart Q&A",
    description:
      "Ask follow-up questions about any clause and get contextual answers grounded in your document.",
  },
];

interface ClearSignHeroProps {
  onGetStarted?: () => void;
}

export function ClearSignHero({ onGetStarted }: ClearSignHeroProps) {
  const controls = useAnimation();
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  React.useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [controls, isInView]);

  const titleWords = [
    "UNDERSTAND",
    "EVERY",
    "CLAUSE",
    "BEFORE",
    "YOU",
    "SIGN",
  ];

  const scrollToUpload = () => {
    if (onGetStarted) {
      onGetStarted();
      return;
    }
    const el = document.getElementById("upload-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="container mx-auto px-4 bg-transparent">
      <header>
        <div className="flex h-20 items-center justify-center">
          <a href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="ClearSign"
              width={160}
              height={64}
              className="w-auto object-contain"
              style={{ height: "max-content", width: "auto" }}
              priority
            />
          </a>
        </div>
      </header>

      <main>
        <section className="container py-20 md:py-24">
          <div className="flex flex-col items-center text-center">
            <motion.h1
              initial={{ filter: "blur(10px)", opacity: 0, y: 50 }}
              animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative font-mono text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl mx-auto leading-tight"
            >
              {titleWords.map((text, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.15,
                    duration: 0.6,
                  }}
                  className="inline-block mx-1.5 md:mx-3"
                >
                  {text}
                </motion.span>
              ))}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="mx-auto mt-8 max-w-2xl text-lg md:text-xl text-foreground/80 font-mono"
            >
              Upload any legal document and get a plain-language breakdown of
              every clause in seconds. No sign-up required.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.6 }}
              className="mt-12 flex flex-wrap justify-center gap-6"
            >
              {labels.map((feature, index) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 1.8 + index * 0.15,
                    duration: 0.6,
                    type: "spring",
                    stiffness: 100,
                    damping: 10,
                  }}
                  className="flex items-center gap-2 px-6"
                >
                  <feature.icon className="h-5 w-5 text-[#2C5EE8]" />
                  <span className="text-sm font-mono">{feature.label}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 2.4,
                duration: 0.6,
                type: "spring",
                stiffness: 100,
                damping: 10,
              }}
            >
              <Button
                size="lg"
                onClick={scrollToUpload}
                className="cursor-pointer rounded-none mt-12 bg-[#2C5EE8] hover:bg-[#2C5EE8]/90 font-mono"
              >
                GET STARTED <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </section>

        <section className="container pb-16" ref={ref}>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={controls}
            variants={{
              visible: { opacity: 1, y: 0 },
            }}
            transition={{
              duration: 0.6,
              type: "spring",
              stiffness: 100,
              damping: 10,
            }}
            className="text-center text-3xl md:text-4xl font-mono font-bold mb-8"
          >
            How ClearSign Works
          </motion.h2>
          <motion.div
            initial={{ opacity: 0 }}
            animate={controls}
            variants={{
              visible: { opacity: 1 },
            }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="grid md:grid-cols-3 max-w-5xl mx-auto gap-0"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 50 }}
                animate={controls}
                variants={{
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{
                  delay: 0.2 + index * 0.2,
                  duration: 0.6,
                  type: "spring",
                  stiffness: 100,
                  damping: 10,
                }}
                className="flex flex-col items-center text-center p-8 bg-white/60 backdrop-blur-sm border border-[#E2E8F0]"
              >
                <div className="mb-6 rounded-full bg-[#2C5EE8]/10 p-4">
                  <feature.icon className="h-8 w-8 text-[#2C5EE8]" />
                </div>
                <h3 className="mb-4 text-xl font-mono font-bold">
                  {feature.label}
                </h3>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </main>
    </div>
  );
}
