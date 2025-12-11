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
    // Check if Supabase is configured
    if (!supabase.supabaseUrl || !supabase.supabaseKey) {
      // Use mock data for demo when Supabase isn't configured
      const mockWords: Word[] = [
        { word: "apple", image_url: "https://images.unsplash.com/photo-1560806887-1295141dd4e8?w=400" },
        { word: "banana", image_url: "https://images.unsplash.com/photo-1587132137056-7f88f1ce138c?w=400" },
        { word: "cat", image_url: "https://images.unsplash.com/photo-1574158622682-e40ad452733d?w=400" },
        { word: "dog", image_url: "https://images.unsplash.com/photo-1633722715463-d30628519e4f?w=400" },
        { word: "elephant", image_url: "https://images.unsplash.com/photo-1564349332651-df9b06fa4e62?w=400" },
      ];
      setWords(mockWords);
      setCurrentIndex(Math.floor(Math.random() * mockWords.length));
      toast.info("Using demo words (Supabase not configured)");
      return;
    }

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
      <div className="bg-gradient-to-r from-primary to-secondary p-1.5 shadow-lg flex-shrink-0">
        <div className="flex justify-between items-center px-2">
          <h1 className="text-base sm:text-lg font-bold text-white">🎨 Word Learning</h1>
          <Button
            onClick={() => navigate("/settings")}
            variant="secondary"
            size="icon"
            className="bg-white/20 hover:bg-white/30 text-white h-7 w-7 sm:h-8 sm:w-8"
          >
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      {/* MODE TOGGLE */}
      <div className="flex items-center justify-end gap-2 px-3 py-1 flex-shrink-0">
        <Image className={`h-3.5 w-3.5 ${mode === "image-first" ? "text-primary" : "text-muted-foreground"}`} />
        <Switch
          checked={mode === "word-first"}
          onCheckedChange={(checked) => setMode(checked ? "word-first" : "image-first")}
          className="data-[state=checked]:bg-primary"
        />
        <Type className={`h-3.5 w-3.5 ${mode === "word-first" ? "text-primary" : "text-muted-foreground"}`} />
      </div>

      {/* CONTENT AREA – FLEX WITH MIN-HEIGHT 0 */}
      <div className="flex-1 min-h-0 flex flex-col landscape:sm:flex-row gap-1 landscape:sm:gap-2 p-1 landscape:sm:p-2">
        {/* IMAGE – LEFT SIDE */}
        <div
          className="
            flex items-center justify-center 
            flex-1 min-h-0
            relative
            landscape:sm:w-1/3
          "
        >
          <button
            onClick={goPrevious}
            className="absolute left-1 z-10 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-lg transition-all"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {currentWord && (mode === "image-first" || wordCompleted) && (
            <img
              src={currentWord.image_url}
              alt={currentWord.word}
              className="
                object-contain rounded-xl shadow-xl border-4 border-primary/20
                animate-scale-in
                
                /* Mobile portrait */
                h-[140px] w-[140px]

                /* Tablet portrait */
                portrait:sm:h-[200px] portrait:sm:w-[200px]
                portrait:md:h-[240px] portrait:md:w-[240px]

                /* Landscape mobile */
                landscape:h-[120px] landscape:w-[120px]
                landscape:sm:h-[160px] landscape:sm:w-[160px]
                landscape:md:h-[200px] landscape:md:w-[200px]
                
                /* Large screens */
                lg:h-[300px] lg:w-[300px]
              "
            />
          )}

          {currentWord && mode === "word-first" && !wordCompleted && (
            <div className="flex items-center justify-center h-[140px] w-[140px] portrait:sm:h-[200px] portrait:sm:w-[200px] portrait:md:h-[240px] portrait:md:w-[240px] landscape:h-[120px] landscape:w-[120px] landscape:sm:h-[160px] landscape:sm:w-[160px] landscape:md:h-[200px] landscape:md:w-[200px] lg:h-[300px] lg:w-[300px] rounded-xl border-4 border-dashed border-primary/30 bg-primary/5">
              <span className="text-4xl sm:text-6xl">❓</span>
            </div>
          )}

          <button
            onClick={goNext}
            className="absolute right-1 z-10 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-lg transition-all"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* WORD BOX – RIGHT SIDE */}
        <div
          className="
            flex items-center justify-center
            flex-1 min-h-0
            landscape:sm:w-2/3
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

      {/* KEYBOARD (BOTTOM) – COMPACT HEIGHT */}
      <div className="portrait:h-[32dvh] landscape:sm:h-[40dvh] landscape:h-[45dvh] lg:h-auto flex-shrink-0 z-50 overflow-hidden">
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
