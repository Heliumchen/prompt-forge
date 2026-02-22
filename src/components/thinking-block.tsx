"use client";

import React, { useEffect, useRef, useState } from "react";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingBlockProps {
  reasoning: string;
  defaultOpen?: boolean;
  className?: string;
}

export function ThinkingBlock({ reasoning, defaultOpen = false, className }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when reasoning content grows (during streaming)
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [reasoning, isOpen]);

  if (!reasoning) return null;

  return (
    <details
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
      className={cn("group/thinking", className)}
    >
      <summary className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
        <Brain className="h-3.5 w-3.5" />
        <span>Thinking</span>
        <span className="text-muted-foreground/60">
          ({reasoning.length} chars)
        </span>
      </summary>
      <div
        ref={contentRef}
        className="mt-1 p-3 rounded-md bg-muted/30 border border-border/50 text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar font-mono"
      >
        {reasoning}
      </div>
    </details>
  );
}
