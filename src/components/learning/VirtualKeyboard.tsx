interface VirtualKeyboardProps {
  onKeyClick: (letter: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  highlightedKey: string;
}

export const VirtualKeyboard = ({
  onKeyClick,
  onBackspace,
  onClear,
  highlightedKey,
}: VirtualKeyboardProps) => {
  const row1 = "QWERTYUIOP".split("");
  const row2 = "ASDFGHJKL".split("");
  const row3 = "ZXCVBNM".split("");

  const KeyButton = ({ letter }: { letter: string }) => (
    <button
      onClick={() => onKeyClick(letter)}
      className={`
        select-none
        rounded-lg
        font-semibold
        flex items-center justify-center
        text-sm md:text-lg
        px-2 md:px-3
        py-2 md:py-3
        active:scale-95
        transition-all
        aspect-square
        ${
          highlightedKey === letter.toLowerCase()
            ? "bg-yellow-400 text-white shadow-lg"
            : "bg-white text-black shadow-md hover:bg-gray-50"
        }
      `}
      style={{
        touchAction: "manipulation",
      }}
    >
      {letter}
    </button>
  );

  return (
    <div
      className="
        w-full
        h-full
        bg-blue-200
        p-1 md:p-2
        rounded-t-2xl
        flex flex-col
        gap-0.5 md:gap-1
        z-50
        overflow-y-auto
      "
    >
      {/* ROW 1 */}
      <div className="grid grid-cols-10 gap-0.5 md:gap-1 w-full">
        {row1.map((l) => (
          <KeyButton key={l} letter={l} />
        ))}
      </div>

      {/* ROW 2 */}
      <div className="grid grid-cols-9 gap-0.5 md:gap-1 w-full mx-auto">
        {row2.map((l) => (
          <KeyButton key={l} letter={l} />
        ))}
      </div>

      {/* ROW 3 */}
      <div className="grid grid-cols-9 gap-0.5 md:gap-1 w-full mx-auto mb-0 pb-0">
        {/* BACKSPACE */}
        <button
          onClick={onBackspace}
          className="
            bg-white shadow-md rounded-lg 
            font-bold flex items-center justify-center 
            text-sm md:text-lg
            active:scale-95
            aspect-square
          "
        >
          ⌫
        </button>

        {row3.map((l) => (
          <KeyButton key={l} letter={l} />
        ))}

        {/* CLEAR */}
        <button
          onClick={onClear}
          className="
            bg-white shadow-md rounded-lg 
            font-bold flex items-center justify-center 
            text-xs md:text-sm
            active:scale-95
            aspect-square
          "
        >
          CLR
        </button>
      </div>
    </div>
  );
};
