"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingSelectProps {
  value?: number;
  onValueChange: (rating: number | undefined) => void;
  disabled?: boolean;
  className?: string;
}

const RATING_OPTIONS = [
  { value: undefined, label: "-", description: "Not rated" },
  { value: 1, label: "1 - Poor", description: "Poor quality" },
  { value: 2, label: "2 - Fair", description: "Fair quality" },
  { value: 3, label: "3 - Good", description: "Good quality" },
  { value: 4, label: "4 - Very Good", description: "Very good quality" },
  { value: 5, label: "5 - Excellent", description: "Excellent quality" },
];

export function RatingSelect({
  value,
  onValueChange,
  disabled = false,
  className,
}: RatingSelectProps) {
  const handleValueChange = (stringValue: string) => {
    if (stringValue === "unrated") {
      onValueChange(undefined);
    } else {
      const numValue = parseInt(stringValue, 10);
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 5) {
        onValueChange(numValue);
      }
    }
  };

  const displayValue = value !== undefined ? value.toString() : "unrated";
  // Display only the number or "-" in the trigger
  const triggerDisplay = value !== undefined ? value.toString() : "-";

  return (
    <Select
      value={displayValue}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
        className={cn("flex items-center gap-1 min-w-[60px]", className)}
      >
        <Star className="h-3 w-3" />
        <span className="text-sm">{triggerDisplay}</span>
      </SelectTrigger>
      <SelectContent>
        {RATING_OPTIONS.map((option) => (
          <SelectItem
            key={option.value ?? "unrated"}
            value={option.value !== undefined ? option.value.toString() : "unrated"}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
