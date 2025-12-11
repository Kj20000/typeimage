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
    <div className="h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex flex-col">
      
      {/* HEADER – SLIM */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 px-4 py-2 shadow-md flex-shrink-0">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-sm sm:text-base font-bold text-white">✨ Word Learning</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-1">
              <Image className={`h-3.5 w-3.5 ${mode === "image-first" ? "text-yellow-300" : "text-white/60"}`} />
              <Switch
                checked={mode === "word-first"}
                onCheckedChange={(checked) => setMode(checked ? "word-first" : "image-first")}
                className="data-[state=checked]:bg-yellow-300 scale-75"
              />
              <Type className={`h-3.5 w-3.5 ${mode === "word-first" ? "text-yellow-300" : "text-white/60"}`} />
            </div>
            <Button
              onClick={() => navigate("/settings")}
              variant="secondary"
              size="icon"
              className="bg-white/20 hover:bg-white/30 text-white h-7 w-7"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* PORTRAIT MODE: IMAGE TOP, WORD BOX MIDDLE, KEYBOARD BOTTOM */}
      <div className="flex-1 min-h-0 flex flex-col portrait:gap-2 portrait:p-2 landscape:hidden">
        
        {/* IMAGE – LARGE AND SQUARE */}
        <div className="flex-1 min-h-0 flex items-center justify-center relative">
          <button
            onClick={goPrevious}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-lg transition-all active:scale-90"
          >
            <ChevronLeft className="h-5 w-5 text-purple-500" />
          </button>

          {currentWord && (mode === "image-first" || wordCompleted) && (
            <div className="bg-white rounded-3xl shadow-lg p-3 border-4 border-purple-200">
              <img
                src={currentWord.image_url}
                alt={currentWord.word}
                className="h-[200px] w-[200px] sm:h-[240px] sm:w-[240px] object-cover rounded-2xl"
              />
            </div>
          )}

          {currentWord && mode === "word-first" && !wordCompleted && (
            <div className="bg-white rounded-3xl shadow-lg p-3 border-4 border-purple-200 flex items-center justify-center h-[200px] w-[200px] sm:h-[240px] sm:w-[240px]">
              <span className="text-7xl sm:text-8xl">❓</span>
            </div>
          )}

          <button
            onClick={goNext}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-lg transition-all active:scale-90"
          >
            <ChevronRight className="h-5 w-5 text-purple-500" />
          </button>
        </div>

        {/* WORD BOX – SQUARE */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl shadow-xl p-4 border-4 border-blue-300 w-full max-w-xs">
            <WordInput
              ref={inputRef}
              value={currentInput}
              suggestion={suggestion}
              wordLength={currentWord?.word.length || 0}
            />
          </div>
        </div>

        {/* KEYBOARD */}
        <div className="flex-shrink-0 h-[28dvh] bg-gradient-to-t from-blue-400 via-blue-300 to-blue-200 rounded-t-3xl shadow-2xl p-2">
          <VirtualKeyboard
            onKeyClick={handleKeyClick}
            onBackspace={handleBackspace}
            onClear={handleClear}
            highlightedKey={highlightedKey}
          />
        </div>
      </div>

      {/* LANDSCAPE MODE: IMAGE LEFT, WORD BOX + KEYBOARD RIGHT */}
      <div className="flex-1 min-h-0 portrait:hidden landscape:flex landscape:gap-2 landscape:p-2">
        
        {/* LEFT SIDE – IMAGE */}
        <div className="landscape:w-[40%] flex items-center justify-center relative">
          <button
            onClick={goPrevious}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-1 shadow-lg transition-all active:scale-90"
          >
            <ChevronLeft className="h-4 w-4 text-purple-500" />
          </button>

          {currentWord && (mode === "image-first" || wordCompleted) && (
            <div className="bg-white rounded-3xl shadow-lg p-2 border-4 border-purple-200">
              <img
                src={currentWord.image_url}
                alt={currentWord.word}
                className="h-[160px] w-[160px] sm:h-[200px] sm:w-[200px] md:h-[240px] md:w-[240px] object-cover rounded-2xl"
              />
            </div>
          )}

          {currentWord && mode === "word-first" && !wordCompleted && (
            <div className="bg-white rounded-3xl shadow-lg p-2 border-4 border-purple-200 flex items-center justify-center h-[160px] w-[160px] sm:h-[200px] sm:w-[200px] md:h-[240px] md:w-[240px]">
              <span className="text-5xl sm:text-6xl">❓</span>
            </div>
          )}

          <button
            onClick={goNext}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-1 shadow-lg transition-all active:scale-90"
          >
            <ChevronRight className="h-4 w-4 text-purple-500" />
          </button>
        </div>

        {/* RIGHT SIDE – WORD BOX + KEYBOARD */}
        <div className="landscape:w-[60%] flex flex-col landscape:gap-1.5">
          
          {/* WORD BOX */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl shadow-xl p-3 border-4 border-blue-300 w-full">
              <WordInput
                ref={inputRef}
                value={currentInput}
                suggestion={suggestion}
                wordLength={currentWord?.word.length || 0}
              />
            </div>
          </div>

          {/* KEYBOARD */}
          <div className="flex-1 min-h-0 bg-gradient-to-t from-blue-400 via-blue-300 to-blue-200 rounded-3xl shadow-2xl p-1.5 overflow-hidden">
            <VirtualKeyboard
              onKeyClick={handleKeyClick}
              onBackspace={handleBackspace}
              onClear={handleClear}
              highlightedKey={highlightedKey}
            />
          </div>
        </div>
      </div>

      {/* LARGE SCREENS: STANDARD LAYOUT */}
      <div className="hidden lg:flex flex-1 min-h-0 gap-4 p-4">
        
        {/* IMAGE */}
        <div className="w-[45%] flex items-center justify-center relative">
          <button
            onClick={goPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all active:scale-90"
          >
            <ChevronLeft className="h-6 w-6 text-purple-500" />
          </button>

          {currentWord && (mode === "image-first" || wordCompleted) && (
            <div className="bg-white rounded-3xl shadow-2xl p-4 border-4 border-purple-200">
              <img
                src={currentWord.image_url}
                alt={currentWord.word}
                className="h-[300px] w-[300px] object-cover rounded-2xl"
              />
            </div>
          )}

          {currentWord && mode === "word-first" && !wordCompleted && (
            <div className="bg-white rounded-3xl shadow-2xl p-4 border-4 border-purple-200 flex items-center justify-center h-[300px] w-[300px]">
              <span className="text-9xl">❓</span>
            </div>
          )}

          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all active:scale-90"
          >
            <ChevronRight className="h-6 w-6 text-purple-500" />
          </button>
        </div>

        {/* RIGHT SIDE – WORD BOX + KEYBOARD */}
        <div className="w-[55%] flex flex-col gap-3">
          
          {/* WORD BOX */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl shadow-2xl p-6 border-4 border-blue-300 w-full">
              <WordInput
                ref={inputRef}
                value={currentInput}
                suggestion={suggestion}
                wordLength={currentWord?.word.length || 0}
              />
            </div>
          </div>

          {/* KEYBOARD */}
          <div className="flex-1 min-h-0 bg-gradient-to-t from-blue-400 via-blue-300 to-blue-200 rounded-3xl shadow-2xl p-3 overflow-hidden">
            <VirtualKeyboard
              onKeyClick={handleKeyClick}
              onBackspace={handleBackspace}
              onClear={handleClear}
              highlightedKey={highlightedKey}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Learning;
