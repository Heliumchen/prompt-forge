import * as React from "react"
import { cn } from "@/lib/utils"

interface AutoTextareaProps extends React.ComponentProps<"textarea"> {
  maxHeight?: number;
}

const AutoTextarea = React.forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ className, maxHeight = 120, onInput, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    
    // Combine refs
    React.useImperativeHandle(ref, () => textareaRef.current!);

    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Calculate the new height, respecting maxHeight
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      
      // Set overflow based on whether content exceeds maxHeight
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, [maxHeight]);

    // Adjust height on mount and value change
    React.useEffect(() => {
      // Use setTimeout to ensure DOM is ready
      const timer = setTimeout(adjustHeight, 0);
      return () => clearTimeout(timer);
    }, [props.value, adjustHeight]);

    // Adjust height on input
    const handleInput = React.useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      onInput?.(e);
    }, [adjustHeight, onInput]);

    // Handle change event as well
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      onChange?.(e);
    }, [adjustHeight, onChange]);

    return (
      <textarea
        ref={textareaRef}
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none min-h-[2.5rem]",
          className
        )}
        onInput={handleInput}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

AutoTextarea.displayName = "AutoTextarea";

export { AutoTextarea };