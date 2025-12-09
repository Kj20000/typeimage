import { forwardRef } from "react";

interface WordInputProps {
  value: string;
  suggestion: string;
  wordLength: number;
}

export const WordInput = forwardRef<HTMLDivElement, WordInputProps>(
  ({ value, suggestion, wordLength }, ref) => {
    return (
      <div ref={ref} className="flex items-center gap-4 justify-center">
        <div 
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-center bg-white rounded-xl px-4 sm:px-6 py-2 sm:py-3 shadow-lg border-2 border-primary/20 uppercase tracking-widest"
          style={{ minWidth: `${Math.max(wordLength * 1.5, 3)}ch` }}
        >
          {value.toUpperCase() || " "}
        </div>
        {suggestion && (
          <div className="text-5xl sm:text-6xl md:text-7xl font-bold text-primary animate-pulse">
            {suggestion}
          </div>
        )}
      </div>
    );
  }
);

WordInput.displayName = "WordInput";
