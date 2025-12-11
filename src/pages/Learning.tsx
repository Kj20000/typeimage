import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Settings, ChevronLeft, ChevronRight, Image, Type } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { WordInput } from "@/components/learning/WordInput";
import { VirtualKeyboard } from "@/components/learning/VirtualKeyboard";
import { Switch } from "@/components/ui/switch";

interface Word {
  word: string;
  image_url: string;
}

type LearningMode = "image-first" | "word-first";

const Learning = () => {
  const navigate = useNavigate();
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [highlightedKey, setHighlightedKey] = useState("");
  const [mode, setMode] = useState<LearningMode>("image-first");
  const [wordCompleted, setWordCompleted] = useState(false);

  const inputRef = useRef<HTMLDivElement>(null);

  const currentWord = words[currentIndex] || null;

  useEffect(() => {
    fetchWords();
  }, []);

  useEffect(() => {
    if (words.length > 0 && currentWord) {
      resetForCurrentWord();
    }
  }, [currentIndex, words]);

  const fetchWords = async () => {
    const { data, error } = await supabase
      .from("words")
      .select("word, image_url")
      .order("word");

    if (error) {
      toast.error("Failed to load words");
      return;
    }

    if (data && data.length > 0) {
      setWords(data);
      setCurrentIndex(Math.floor(Math.random() * data.length));
    }
  };

  const resetForCurrentWord = () => {
    setCurrentInput("");
    setWordCompleted(false);
    if (currentWord && currentWord.word.length > 0) {
      const firstLetter = currentWord.word[0];
      setSuggestion(firstLetter.toUpperCase());
      setHighlightedKey(firstLetter.toLowerCase());
      setTimeout(() => speak(firstLetter), 400);
    }
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.8;
      utter.volume = 1.0;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    }, 120);
  };

  const handleInputChange = (value: string) => {
    if (!currentWord) return;
    const lower = value.toLowerCase();
    if (!currentWord.word.startsWith(lower)) return;

    setCurrentInput(lower);

    if (lower) {
      const nextIndex = lower.length;
      if (nextIndex < currentWord.word.length) {
        const nextLetter = currentWord.word[nextIndex];
        setSuggestion(nextLetter.toUpperCase());
        setHighlightedKey(nextLetter.toLowerCase());
        speak(nextLetter);
      } else {
        setSuggestion("");
        setHighlightedKey("");
      }

      if (lower === currentWord.word) {
        speak(currentWord.word);
        if (mode === "word-first") {
          setWordCompleted(true);
          setTimeout(() => goNext(), 1500);
        } else {
          setTimeout(() => goNext(), 800);
        }
      }
    } else {
      setSuggestion("");
      setHighlightedKey("");
    }
  };

  const handleKeyClick = (letter: string) => {
    handleInputChange(currentInput + letter.toLowerCase());
  };

  const handleBackspace = () => {
    handleInputChange(currentInput.slice(0, -1));
  };

  const handleClear = () => {
    handleInputChange("");
  };

  const goPrevious = () => {
    if (words.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
  };

  const goNext = () => {
    if (words.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % words.length);
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-primary to-secondary p-2 shadow-lg flex-shrink-0">
        <div className="flex justify-between items-center px-2">
          <h1 className="text-lg font-bold text-white">🎨 Word Learning</h1>
          <Button
            onClick={() => navigate("/settings")}
            variant="secondary"
            size="icon"
            className="bg-white/20 hover:bg-white/30 text-white h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* MODE TOGGLE */}
      <div className="flex items-center justify-end gap-2 px-4 py-2 flex-shrink-0">
        <Image className={`h-4 w-4 ${mode === "image-first" ? "text-primary" : "text-muted-foreground"}`} />
        <Switch
          checked={mode === "word-first"}
          onCheckedChange={(checked) => setMode(checked ? "word-first" : "image-first")}
          className="data-[state=checked]:bg-primary"
        />
        <Type className={`h-4 w-4 ${mode === "word-first" ? "text-primary" : "text-muted-foreground"}`} />
      </div>

      {/* CONTENT – FIXED 50/50 LAYOUT ON LARGE SCREENS */}
      <div
        className="
          flex-1 min-h-0
          flex flex-col
          lg:flex-row
          portrait:pb-[40dvh] landscape:pb-[50dvh]
        "
      >
        {/* IMAGE – FIXED LEFT SIDE */}
        <div
          className="
            flex-1 flex items-center justify-center
            p-4
            relative min-h-0
            lg:w-1/2 lg:justify-center
          "
        >
          <button
            onClick={goPrevious}
            className="absolute left-2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
          >
            <ChevronLeft className="h-6 w-6 text-primary" />
          </button>

          {currentWord && (mode === "image-first" || wordCompleted) && (
            <img
              src={currentWord.image_url}
              alt={currentWord.word}
              className="
                object-contain rounded-xl shadow-xl border-4 border-primary/20
                animate-scale-in
                
                /* Mobile size */
                w-[230px] h-[230px]

                /* Tablet portrait */
                portrait:md:w-[450px] portrait:md:h-[300px]
                
                /* Landscape FIXED height reduced */
                landscape:md:w-[500px] 
                landscape:md:h-[260px] 
                landscape:max-h-[260px]
              "
            />
          )}

          {currentWord && mode === "word-first" && !wordCompleted && (
            <div className="flex items-center justify-center w-[230px] h-[230px] portrait:md:w-[450px] portrait:md:h-[300px] landscape:md:w-[500px] landscape:md:h-[260px] rounded-xl border-4 border-dashed border-primary/30 bg-primary/5">
              <span className="text-6xl">❓</span>
            </div>
          )}

          <button
            onClick={goNext}
            className="absolute right-2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
          >
            <ChevronRight className="h-6 w-6 text-primary" />
          </button>
        </div>

        {/* FIXED RIGHT SIDE – WORD BOX */}
        <div
          className="
            flex items-center justify-center
            py-4 md:py-2 px-4
            lg:w-1/2 lg:justify-center
          "
        >
          <WordInput
            ref={inputRef}
            value={currentInput}
            suggestion={suggestion}
            wordLength={currentWord?.word.length || 0}
          />
        </div>
      </div>

      {/* KEYBOARD (BOTTOM FIXED) */}
      <div className="fixed bottom-0 left-0 right-0 portrait:h-[40dvh] landscape:h-[50dvh] z-50">
        <VirtualKeyboard
          onKeyClick={handleKeyClick}
          onBackspace={handleBackspace}
          onClear={handleClear}
          highlightedKey={highlightedKey}
        />
      </div>
    </div>
  );
};

export default Learning;
