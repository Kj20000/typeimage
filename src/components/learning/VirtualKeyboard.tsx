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
        rounded-xl
        font-bold
        flex items-center justify-center
        text-xs sm:text-sm md:text-base
        active:scale-90
        transition-all
        shadow-md
        aspect-square
        border-2 border-blue-600
        ${
          highlightedKey === letter.toLowerCase()
            ? "bg-gradient-to-br from-yellow-300 to-yellow-400 text-blue-800 shadow-lg border-yellow-500"
            : "bg-gradient-to-br from-white to-gray-100 text-blue-800 hover:from-blue-50 hover:to-blue-100"
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
    <div className="w-full h-full bg-gradient-to-b from-blue-300 via-blue-350 to-blue-400 flex flex-col gap-1 md:gap-1.5 p-1.5 md:p-2 overflow-y-auto">
      {/* ROW 1 */}
      <div className="grid grid-cols-10 gap-1 md:gap-1.5 w-full">
        {row1.map((l) => (
          <KeyButton key={l} letter={l} />
        ))}
      </div>

      {/* ROW 2 */}
      <div className="grid grid-cols-9 gap-1 md:gap-1.5 mx-auto" style={{ width: "95%" }}>
        {row2.map((l) => (
          <KeyButton key={l} letter={l} />
        ))}
      </div>

      {/* ROW 3 */}
      <div className="grid grid-cols-9 gap-1 md:gap-1.5 mx-auto" style={{ width: "95%" }}>
        {/* BACKSPACE */}
        <button
          onClick={onBackspace}
          className="
            bg-gradient-to-br from-red-300 to-red-400
            shadow-md rounded-xl 
            font-bold flex items-center justify-center 
            text-xs sm:text-sm md:text-base
            border-2 border-red-600
            active:scale-90
            transition-all
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
            bg-gradient-to-br from-orange-300 to-orange-400
            shadow-md rounded-xl 
            font-bold flex items-center justify-center 
            text-xs sm:text-sm md:text-base
            border-2 border-orange-600
            active:scale-90
            transition-all
            aspect-square
          "
        >
          CLR
        </button>
      </div>
    </div>
  );
};
