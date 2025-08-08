import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScanEye, Settings2, X } from "lucide-react";
import { ModelSelect } from "@/components/model-select";
import ReactMarkdown from "react-markdown";

interface PromptReviewSectionProps {
  selectedReviewModel: string;
  reviewContent: string;
  isReviewing: boolean;
  isStreamingReview: boolean;
  onModelChange: (value: string) => void;
  onReview: () => void;
  onClearReview: () => void;
}

export function PromptReviewSection({
  selectedReviewModel,
  reviewContent,
  isReviewing,
  isStreamingReview,
  onModelChange,
  onReview,
  onClearReview,
}: PromptReviewSectionProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <Alert className="border-dashed mb-2">
        <ScanEye className="h-4 w-4" />
        <AlertTitle>AI Prompt Review</AlertTitle>
        <AlertDescription>
          Get an overall assessment and actionable suggestions for improvement
          (reasoning-capable models required)
        </AlertDescription>
      </Alert>
      <div className="flex gap-4">
        <ModelSelect value={selectedReviewModel} onChange={onModelChange} />
        <Button className="flex-1" onClick={onReview} disabled={isReviewing}>
          {isReviewing ? (
            <>
              <div className="animate-spin mr-2">⌛</div>
              Reviewing...
            </>
          ) : (
            <>
              <Settings2 className="mr-2" />
              Review Prompt
            </>
          )}
        </Button>
      </div>

      {/* Review Results Display */}
      {(reviewContent || isStreamingReview) && (
        <div className="relative p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 w-full">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={onClearReview}
            disabled={isStreamingReview}
          >
            <X className="h-3 w-3" />
          </Button>
          <div className="prose prose-sm max-w-none dark:prose-invert pr-8">
            <ReactMarkdown>{reviewContent}</ReactMarkdown>
            {isStreamingReview && !reviewContent && (
              <div className="animate-pulse text-gray-500">Reviewing...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
