import { hapticTap } from "@/lib/haptics";

interface VirtualKeyboardProps {
  onKeyClick: (letter: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  highlightedKey: string;
  layoutMode: 'mobile-portrait' | 'mobile-landscape' | 'ipad-portrait' | 'ipad-landscape';
}

export const VirtualKeyboard = ({
  onKeyClick,
  onBackspace,
  onClear,
  highlightedKey,
  layoutMode,
}: VirtualKeyboardProps) => {
  const row1 = "QWERTYUIOP".split("");
  const row2 = "ASDFGHJKL".split("");
  const row3 = "ZXCVBNM".split("");

  // Different styling based on layout mode
  const isMobileLandscape = layoutMode === 'mobile-landscape';
  
  const baseKey = isMobileLandscape
    ? "select-none rounded-2xl font-semibold flex items-center justify-center text-sm px-2 py-2 transition-all duration-100 active:scale-90 active:shadow-inner"
    : "select-none rounded-2xl font-semibold flex items-center justify-center text-lg sm:text-2xl px-3 sm:px-4 py-3 sm:py-4 transition-all duration-100 active:scale-90 active:shadow-inner";

  const KeyButton = ({ letter }: { letter: string }) => {
    const isHighlight = highlightedKey === letter.toLowerCase();

    return (
      <button
        onClick={() => {
          hapticTap(15);
          onKeyClick(letter);
        }}
        className={`
          ${baseKey}
          ${
            isHighlight
              ? "bg-secondary text-white shadow-lg scale-105"
              : "bg-card text-card-foreground shadow-md hover:bg-muted border border-border"
          }
          active:bg-primary/20
        `}
        style={{ touchAction: "manipulation" }}
      >
        {letter}
      </button>
    );
  };

  const ActionButton = ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => (
    <button
      onClick={() => {
        hapticTap(25);
        onClick();
      }}
      className={`
        ${baseKey}
        bg-accent text-accent-foreground shadow-md border border-border
        active:bg-destructive/20
      `}
      style={{ touchAction: "manipulation" }}
    >
      {label}
    </button>
  );

  return (
    <div
      className={`
        relative w-full bg-primary/20 rounded-t-2xl flex flex-col z-50 border-t-2 border-primary/30
        ${isMobileLandscape ? 'pt-2 px-2 pb-0 gap-1.5' : 'pt-3 sm:pt-4 px-3 sm:px-4 pb-0 gap-2 sm:gap-3'}
      `}
    >
      {/* ROW 1 */}
      <div className={`grid grid-cols-10 w-full ${isMobileLandscape ? 'gap-1.5' : 'gap-2 sm:gap-3'}`}>
        {row1.map((l) => (
          <KeyButton key={l} letter={l} />
        ))}
      </div>

      {/* ROW 2 */}
      <div className={`grid grid-cols-9 w-[92%] mx-auto ${isMobileLandscape ? 'gap-1.5' : 'gap-2 sm:gap-3'}`}>
        {row2.map((l) => (
          <KeyButton key={l} letter={l} />
        ))}
      </div>

      {/* ROW 3 */}
      <div className={`grid grid-cols-9 w-[92%] mx-auto ${isMobileLandscape ? 'gap-1.5 pb-2' : 'gap-2 sm:gap-3 pb-3 sm:pb-4'}`}>
        <ActionButton label="⌫" onClick={onBackspace} />

        {row3.map((l) => (
          <KeyButton key={l} letter={l} />
        ))}

        <ActionButton label="CLR" onClick={onClear} />
      </div>
    </div>
  );
};
