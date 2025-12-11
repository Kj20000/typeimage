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
        rounded-2xl
        font-semibold
        flex items-center justify-center
        text-lg sm:text-2xl
        px-3 sm:px-4
        py-3 sm:py-4
        active:scale-95
        transition-all
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
        fixed
        bottom-0
        left-0
        w-full
        bg-blue-200
        p-3 sm:p-4
        rounded-t-2xl
        flex flex-col
        gap-2 sm:gap-3
        z-50
      "
    >
      {/* ROW 1 */}
      <div className="grid grid-cols-10 gap-2 sm:gap-3 w-full">
        {row1.map((l) => (
          <KeyButton key={l} letter={l} />
        ))}
      </div>

      {/* ROW 2 */}
      <div className="grid grid-cols-9 gap-2 sm:gap-3 w-[92%] mx-auto">
        {row2.map((l) => (
          <KeyButton key={l} letter={l} />
        ))}
      </div>

      {/* ROW 3 */}
      <div className="grid grid-cols-9 gap-2 sm:gap-3 w-[92%] mx-auto mb-0 pb-0">
        {/* BACKSPACE */}
        <button
          onClick={onBackspace}
          className="
            bg-white shadow-md rounded-2xl 
            font-bold flex items-center justify-center 
            text-lg sm:text-2xl
            px-3 sm:px-4 py-3 sm:py-4
            active:scale-95
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
            bg-white shadow-md rounded-2xl 
            font-bold flex items-center justify-center 
            text-lg sm:text-2xl
            px-3 sm:px-4 py-3 sm:py-4
            active:scale-95
          "
        >
          CLR
        </button>
      </div>
    </div>
  );
};
