import { useEffect } from "react";

export function useKeyboardShortcuts(
  isGenerating: boolean,
  handleGenerate: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
        const modifierKey = isMac ? e.metaKey : e.ctrlKey;

        if (modifierKey && !isGenerating) {
          e.preventDefault();
          handleGenerate();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGenerating, handleGenerate]);
}