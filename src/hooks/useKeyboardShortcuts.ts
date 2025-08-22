import { useEffect } from "react";

export function useKeyboardShortcuts(
  isGenerating: boolean,
  handleGenerate: () => void,
  onPasteJSON?: (jsonData: string) => void
) {
  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    
    const isInputFocused = () => {
      const activeElement = document.activeElement;
      if (!activeElement) return false;
      
      const isTextInput = ['INPUT', 'TEXTAREA'].includes(activeElement.tagName) ||
                         (activeElement as HTMLElement).contentEditable === 'true';
      
      const hasSelection = (window.getSelection()?.toString()?.length || 0) > 0;
      
      return isTextInput || hasSelection;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === "Enter") {
        if (modifierKey && !isGenerating) {
          e.preventDefault();
          handleGenerate();
        }
      } else if (e.key === "v" && modifierKey && onPasteJSON && !isInputFocused()) {
        e.preventDefault();
        
        navigator.clipboard.readText()
          .then((text) => {
            if (text.trim()) {
              try {
                JSON.parse(text);
                onPasteJSON(text);
              } catch {
                // Not valid JSON, ignore
              }
            }
          })
          .catch(() => {
            // Clipboard access failed, ignore
          });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGenerating, handleGenerate, onPasteJSON]);
}