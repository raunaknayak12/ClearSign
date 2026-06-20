'use client';

import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail } from 'lucide-react';

export default function FooterSection() {
  return (
    <footer className="md:rounded-t-6xl relative w-full max-w-6xl mx-auto flex flex-col items-center justify-center rounded-t-4xl border-t border-[#E2E8F0] bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] px-6 py-12 lg:py-16">
      <div className="bg-foreground/20 absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur" />

      <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
        {/* Brand Column */}
        <AnimatedContainer className="space-y-4">
          <Image
            src="/logo.png"
            alt="ClearSign"
            width={100}
            height={40}
            className="w-auto object-contain"
            style={{ height: "max-content", width: "auto" }}
          />
          <p className="text-muted-foreground mt-8 text-sm md:mt-0">
            © {new Date().getFullYear()} ClearSign. All rights reserved.
          </p>
        </AnimatedContainer>

        {/* Link Columns */}
        <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-3 xl:col-span-2 xl:mt-0">
          {/* Contact */}
          <AnimatedContainer delay={0.2}>
            <div className="mb-10 md:mb-0">
              <h3 className="text-xs font-semibold uppercase tracking-wide">Contact</h3>
              <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                <li>
                  <a
                    href="mailto:raunaknayak2006@gmail.com"
                    className="hover:text-foreground inline-flex items-center transition-all duration-300"
                  >
                    <Mail className="me-1.5 size-4" />
                    Email
                  </a>
                </li>
              </ul>
            </div>
          </AnimatedContainer>

          {/* Developer */}
          <AnimatedContainer delay={0.3}>
            <div className="mb-10 md:mb-0">
              <h3 className="text-xs font-semibold uppercase tracking-wide">Developer</h3>
              <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                <li>
                  <Link
                    href="https://www.linkedin.com/in/raunak-nayak-5b937732a"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground inline-flex items-center transition-all duration-300"
                  >
                    Raunak Nayak
                  </Link>
                </li>
              </ul>
            </div>
          </AnimatedContainer>

          {/* Legal */}
          <AnimatedContainer delay={0.4}>
            <div className="mb-10 md:mb-0">
              <h3 className="text-xs font-semibold uppercase tracking-wide">Legal</h3>
              <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                <li className="leading-relaxed">
                  ClearSign assists document understanding. It does not provide legal advice.
                  Always consult a qualified lawyer for decisions that affect your rights.
                </li>
              </ul>
            </div>
          </AnimatedContainer>
        </div>
      </div>
    </footer>
  );
}

type ViewAnimationProps = {
  delay?: number;
  className?: ComponentProps<typeof motion.div>['className'];
  children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return children;
  }

  return (
    <motion.div
      initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
