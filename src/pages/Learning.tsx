import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, ChevronLeft, ChevronRight, Image, Type } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { WordInput } from "@/components/learning/WordInput";
import { VirtualKeyboard } from "@/components/learning/VirtualKeyboard";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getWords } from "@/storage/words";
import { getCategories } from "@/storage/categories";
import { loadImageFile } from "@/storage/files";
import { getImageDisplayMode, getCelebrationEnabled } from "@/storage/settings";
import { hapticTap } from "@/lib/haptics";

/* =========================
   DEVICE & ORIENTATION DETECTION
========================= */
const useDeviceLayout = () => {
  const [layout, setLayout] = useState<'mobile-portrait' | 'mobile-landscape' | 'ipad-portrait' | 'ipad-landscape'>('mobile-portrait');

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;
      // Mobile: up to 6.5 inch screen (930px in landscape mode, 430px in portrait)
      const isMobile = (isPortrait && width <= 430) || (!isPortrait && width <= 930);

      if (isMobile && isPortrait) {
        setLayout('mobile-portrait');
      } else if (isMobile && !isPortrait) {
        setLayout('mobile-landscape');
      } else if (!isMobile && isPortrait) {
        setLayout('ipad-portrait');
      } else {
        setLayout('ipad-landscape');
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, []);

  return layout;
};

/* =========================
   TYPES
========================= */
interface Word {
  id: string;
  word: string;
  image: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

type LearningMode = "image-first" | "word-first";

/* =========================
   TTS
========================= */
let speechUnlocked = false;
let lastSpoken = "";
let selectedVoice: SpeechSynthesisVoice | null = null;

// Load voices and select Indian/Female voice
const loadVoices = () => {
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return;
  
  // Priority order for voice selection:
  // 1. Indian female voices (hi-IN, en-IN)
  // 2. Any female voice with "en-IN" or "hi-IN"
  // 3. Any female voice
  // 4. Default female voice
  
  const indianFemaleVoice = voices.find(v => 
    v.lang.includes('hi-IN') && v.name.toLowerCase().includes('female')
  ) || voices.find(v => 
    v.lang.includes('en-IN') && v.name.toLowerCase().includes('female')
  ) || voices.find(v => 
    (v.lang.includes('hi-IN') || v.lang.includes('en-IN')) && !v.name.toLowerCase().includes('male')
  ) || voices.find(v => 
    v.name.toLowerCase().includes('female')
  ) || voices.find(v => 
    !v.name.toLowerCase().includes('male') && v.lang.startsWith('en')
  );
  
  if (indianFemaleVoice) {
    selectedVoice = indianFemaleVoice;
  }
};

// Initialize voices
if (typeof window !== 'undefined') {
  loadVoices();
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

const speak = (text: string) => {
  if (!speechUnlocked || !text || text === lastSpoken) return;
  lastSpoken = text;
  speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  
  // Set voice if available
  if (selectedVoice) {
    u.voice = selectedVoice;
  }
  
  // Expressive and child-friendly settings
  u.rate = 0.75; // Slower for clarity
  u.pitch = 1.2; // Higher pitch for female voice
  u.volume = 1;
  
  // Use en-IN locale if voice supports it
  if (selectedVoice?.lang.includes('IN')) {
    u.lang = selectedVoice.lang;
  } else {
    u.lang = 'en-IN'; // Request Indian English
  }
  
  speechSynthesis.speak(u);
};

/* =========================
   COMPONENT
========================= */
const Learning = () => {
  const navigate = useNavigate();
  const layout = useDeviceLayout();

  const [allWords, setAllWords] = useState<Word[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [highlightedKey, setHighlightedKey] = useState("");
  const [mode, setMode] = useState<LearningMode>("image-first");
  const [wordCompleted, setWordCompleted] = useState(false);
  const [imageSrc, setImageSrc] = useState("");
  const [showBalloons, setShowBalloons] = useState(false);
  const [balloons, setBalloons] = useState<Array<{id: number, x: number, popped: boolean}>>([]);
  const [stars, setStars] = useState<Array<{id: number, x: number, y: number}>>([]);
  const [confetti, setConfetti] = useState<Array<{id: number, x: number, y: number, vx: number, vy: number}>>([]);
  
  // For random mode: shuffled indices to avoid repeats
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [shufflePosition, setShufflePosition] = useState(0);

  const currentWord = words[currentIndex] || null;

  /* SHUFFLE HELPER */
  const createShuffledIndices = (length: number): number[] => {
    const indices = Array.from({ length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  };

  /* LOAD DATA */
  useEffect(() => {
    Promise.all([getWords(), getCategories()]).then(
      ([loadedWords, loadedCategories]) => {
        if (!loadedWords.length) {
          toast.error("No words found. Add words in Settings.");
        }
        setAllWords(loadedWords);
        // Don't set words here, let category filter handle the ordering
        setCategories(loadedCategories);
      }
    );
  }, []);

  /* LOAD IMAGE */
  useEffect(() => {
    if (!currentWord?.image) {
      setImageSrc("");
      return;
    }
    loadImageFile(currentWord.image)
      .then(setImageSrc)
      .catch(() => setImageSrc(""));
  }, [currentWord]);

  /* RESET WORD */
  useEffect(() => {
    if (!currentWord) return;

    setCurrentInput("");
    setWordCompleted(false);

    const first = currentWord.word[0];
    setSuggestion(first.toUpperCase());
    setHighlightedKey(first.toLowerCase());

    if (speechUnlocked) {
      setTimeout(() => speak(first), 400);
    }
  }, [currentIndex, words]);

  /* CATEGORY FILTER */
  useEffect(() => {
    const mode = getImageDisplayMode();
    const filtered =
      selectedCategory === "all"
        ? allWords
        : allWords.filter(w => w.category_id === selectedCategory);

    // Apply mode-specific ordering
    // New images are prepended (index 0 = newest, index N = oldest)
    let orderedWords = [...filtered];
    if (mode === "S") {
      // Sequential mode: older to newer (reverse the prepended list)
      orderedWords = orderedWords.reverse();
    }
    // Reverse mode: newer to older (keep as is)

    setWords(orderedWords);
    if (orderedWords.length) {
      // Both modes start from first item
      setCurrentIndex(0);
      setShuffledIndices([]);
      setShufflePosition(0);
    }
  }, [selectedCategory, allWords]);

  /* PLAY CLAP SOUND */
  const playClap = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioContext.currentTime;
      
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // fail silently
    }
  };

  /* INPUT HANDLERS */
  const handleInputChange = (value: string) => {
    if (!currentWord) return;

    const lower = value.toLowerCase();
    if (!currentWord.word.startsWith(lower)) return;

    setCurrentInput(lower);

    if (lower.length < currentWord.word.length) {
      const next = currentWord.word[lower.length];
      setSuggestion(next.toUpperCase());
      setHighlightedKey(next.toLowerCase());
      speak(next);
    } else {
      setSuggestion("");
      setHighlightedKey("");
      setWordCompleted(true);

      const word = currentWord.word;
      speak(word);
      setTimeout(() => speak(`${word[0].toUpperCase()} for ${word}`), 700);
      
      // Haptic feedback
      hapticTap(50);
      
      // Check if celebration is enabled
      const celebrationEnabled = getCelebrationEnabled();
      
      if (celebrationEnabled) {
        // Play multiple celebratory claps
        playClap();
        setTimeout(() => playClap(), 200);
        setTimeout(() => playClap(), 400);
        
        // Show balloons celebration with 4 balloons
        setShowBalloons(true);
        setBalloons([
          { id: 1, x: 15 + Math.random() * 15, popped: false },
          { id: 2, x: 35 + Math.random() * 15, popped: false },
          { id: 3, x: 55 + Math.random() * 15, popped: false },
          { id: 4, x: 75 + Math.random() * 15, popped: false }
        ]);
        
        // Create confetti burst
        const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
          id: Date.now() + i,
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8 - 3
        }));
        setConfetti(confettiPieces);
        
        // Remove confetti after animation
        setTimeout(() => {
          setConfetti([]);
        }, 2000);
        
        // Auto move to next after balloons fly away (5 seconds)
        setTimeout(() => {
          setShowBalloons(false);
          setBalloons([]);
          setStars([]);
          goNext();
        }, 5000);
      } else {
        // No celebration, just single clap and move to next after a short delay
        playClap();
        setTimeout(() => {
          goNext();
        }, 1500);
      }
    }
  };

  const handleKeyClick = (l: string) => {
    if (!speechUnlocked) speechUnlocked = true;
    handleInputChange(currentInput + l.toLowerCase());
  };

  const handleBackspace = () =>
    handleInputChange(currentInput.slice(0, -1));

  const handleClear = () => handleInputChange("");

  const goPrevious = () => {
    setCurrentIndex(i => (i - 1 + words.length) % words.length);
  };

  const goNext = () => {
    setCurrentIndex(i => (i + 1) % words.length);
  };

  const handleBalloonPop = (balloonId: number, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left + rect.width / 2;
    const y = e.clientY - rect.top + rect.height / 2;
    
    // Mark balloon as popped
    setBalloons(prev => prev.map(b => 
      b.id === balloonId ? { ...b, popped: true } : b
    ));
    
    // Create celebration stars
    const newStars = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }));
    setStars(prev => [...prev, ...newStars]);
    
    // Remove stars after animation
    setTimeout(() => {
      setStars(prev => prev.filter(s => !newStars.find(ns => ns.id === s.id)));
    }, 1000);
    
    // If all balloons popped, move to next word faster
    const allPopped = balloons.every(b => b.id === balloonId || b.popped);
    if (allPopped) {
      setTimeout(() => {
        setShowBalloons(false);
        setBalloons([]);
        setStars([]);
        goNext();
      }, 800);
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col bg-gradient-to-br from-primary/10 to-secondary/10 relative">
      {/* Cartoon background decorations */}
      <div className="absolute top-8 left-4 w-20 h-20 bg-yellow-300 rounded-full opacity-70 blur-sm"></div>
      <div className="absolute top-32 right-8 w-32 h-32 bg-blue-300 rounded-full opacity-60 blur-lg"></div>
      <div className="absolute bottom-40 left-8 w-24 h-24 bg-pink-300 rounded-full opacity-50 blur-md"></div>
      <div className="absolute bottom-20 right-12 w-28 h-28 bg-green-300 rounded-full opacity-60 blur-lg"></div>
      <div className="absolute top-1/3 right-20 w-16 h-16 bg-purple-300 rounded-full opacity-40 blur-md"></div>

      {/* HEADER */}
      <div className="bg-gradient-to-r from-primary to-secondary p-3 rounded-b-3xl shadow-lg relative z-10">
        <div className="flex justify-between items-center px-3">
          <h1 className="text-2xl font-black text-white drop-shadow-lg">🎨 Word Learning</h1>
          <div className="flex items-center gap-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 w-[140px] bg-white/30 text-white font-bold rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌟 All</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => navigate("/settings")}
              size="icon"
              className="bg-white/30 text-white h-9 w-9 rounded-full hover:bg-white/50"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* MODE */}
      <div className="flex justify-end gap-2 px-4 py-2">
        <Image className={mode === "image-first" ? "text-primary" : ""} />
        <Switch
          checked={mode === "word-first"}
          onCheckedChange={c => setMode(c ? "word-first" : "image-first")}
        />
        <Type className={mode === "word-first" ? "text-primary" : ""} />
      </div>

      {/* ========================================
           LAYOUT 1: MOBILE PORTRAIT
      ======================================== */}
      {layout === 'mobile-portrait' && (
        <>
          <div className="flex-1 flex flex-col items-center gap-4 px-3 pt-4 pb-[280px]">
            {/* IMAGE */}
            <div className="w-full flex items-center justify-center gap-2 px-3">
              <button
                onClick={goPrevious}
                className="shrink-0 rounded-full bg-white/30 p-2 hover:scale-110 transition-transform"
              >
                <ChevronLeft className="w-7 h-7 text-white drop-shadow" />
              </button>

              <div className="relative w-[80%] max-w-[352px]">
                {currentWord && imageSrc && (mode === "image-first" || wordCompleted) && (
                  <div className="w-full aspect-square rounded-3xl border-4 border-white shadow-2xl drop-shadow-xl overflow-hidden flex items-center justify-center bg-white">
                    <img
                      src={imageSrc}
                      alt={currentWord.word}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}

                {currentWord && mode === "word-first" && !wordCompleted && (
                  <div className="w-full aspect-square rounded-3xl border-4 border-dashed border-blue-400 flex items-center justify-center bg-white/40 shadow-xl">
                    <span className="text-8xl animate-bounce">❓</span>
                  </div>
                )}
              </div>

              <button
                onClick={goNext}
                className="shrink-0 rounded-full bg-white/30 p-2 hover:scale-110 transition-transform"
              >
                <ChevronRight className="w-7 h-7 text-white drop-shadow"/>
              </button>
            </div>

            {/* WORD INPUT */}
            <div className="w-full flex items-center justify-center">
              <WordInput
                value={currentInput}
                suggestion={suggestion}
                wordLength={currentWord?.word.length || 0}
              />
            </div>
          </div>

          {/* KEYBOARD - FIXED BOTTOM */}
          <div className="fixed bottom-0 left-0 right-0">
            <VirtualKeyboard
              onKeyClick={handleKeyClick}
              onBackspace={handleBackspace}
              onClear={handleClear}
              highlightedKey={highlightedKey}
              layoutMode="mobile-portrait"
            />
          </div>
        </>
      )}

      {/* ========================================
           LAYOUT 2: MOBILE LANDSCAPE
      ======================================== */}
      {layout === 'mobile-landscape' && (
        <div className="flex-1 flex flex-row h-full">
          {/* LEFT: IMAGE */}
          <div className="relative w-1/2 flex items-center justify-center p-2">
            <button onClick={goPrevious} className="absolute left-2 z-10">
              <ChevronLeft />
            </button>

            {currentWord && imageSrc && (mode === "image-first" || wordCompleted) && (
              <img
                src={imageSrc}
                alt={currentWord.word}
                className="object-contain rounded-xl max-h-[calc(100dvh-120px)] max-w-full"
              />
            )}

            {currentWord && mode === "word-first" && !wordCompleted && (
              <div className="w-full h-[calc(100dvh-120px)] max-w-[400px] rounded-xl border-4 border-dashed border-primary/30 flex items-center justify-center bg-primary/5">
                <span className="text-6xl">❓</span>
              </div>
            )}

            <button onClick={goNext} className="absolute right-2 z-10">
              <ChevronRight />
            </button>
          </div>

          {/* RIGHT: WORD INPUT + KEYBOARD */}
          <div className="w-1/2 flex flex-col h-full">
            {/* WORD INPUT - TOP */}
            <div className="flex-1 flex items-center justify-center px-4">
              <WordInput
                value={currentInput}
                suggestion={suggestion}
                wordLength={currentWord?.word.length || 0}
              />
            </div>

            {/* KEYBOARD - BOTTOM */}
            <div className="shrink-0">
              <VirtualKeyboard
                onKeyClick={handleKeyClick}
                onBackspace={handleBackspace}
                onClear={handleClear}
                highlightedKey={highlightedKey}
                layoutMode="mobile-landscape"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================
           LAYOUT 3: IPAD PORTRAIT
      ======================================== */}
      {layout === 'ipad-portrait' && (
        <>
          <div className="flex-1 flex flex-col pb-[280px]">
            {/* IMAGE */}
            <div className="relative flex-initial flex items-start justify-center p-3 pt-12">
              <button onClick={goPrevious} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 hover:scale-110 transition-transform">
                <ChevronLeft className="w-8 h-8 text-white drop-shadow-lg" />
              </button>

              {currentWord && imageSrc && (mode === "image-first" || wordCompleted) && (
                <div className="w-[68%] aspect-square max-w-[400px] rounded-3xl border-4 border-white shadow-2xl drop-shadow-xl overflow-hidden flex items-center justify-center bg-white">
                  <img
                    src={imageSrc}
                    alt={currentWord.word}
                    className="object-cover w-full h-full rounded-[1.25rem]"
                  />
                </div>
              )}

              {currentWord && mode === "word-first" && !wordCompleted && (
                <div className="w-[68%] aspect-square max-w-[400px] rounded-3xl border-4 border-dashed border-blue-400 flex items-center justify-center bg-white/40 shadow-xl">
                  <span className="text-9xl animate-bounce">❓</span>
                </div>
              )}

              <button onClick={goNext} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 hover:scale-110 transition-transform">
                <ChevronRight className="w-8 h-8 text-white drop-shadow-lg"/>
              </button>
            </div>

            {/* WORD INPUT */}
            <div className="flex items-center justify-center min-h-[60px] px-4 pt-3">
              <WordInput
                value={currentInput}
                suggestion={suggestion}
                wordLength={currentWord?.word.length || 0}
              />
            </div>
          </div>

          {/* KEYBOARD - FIXED BOTTOM */}
          <div className="fixed bottom-0 left-0 right-0">
            <VirtualKeyboard
              onKeyClick={handleKeyClick}
              onBackspace={handleBackspace}
              onClear={handleClear}
              highlightedKey={highlightedKey}
              layoutMode="ipad-portrait"
            />
          </div>
        </>
      )}

      {/* ========================================
           LAYOUT 4: IPAD LANDSCAPE
      ======================================== */}
      {layout === 'ipad-landscape' && (
        <>
          <div className="flex-1 flex flex-row pb-[280px]">
            {/* LEFT: IMAGE */}
            <div className="relative w-1/2 flex items-center justify-center p-2 -translate-y-3">
              <button onClick={goPrevious} className="absolute left-2 z-10">
                <ChevronLeft />
              </button>

              {currentWord && imageSrc && (mode === "image-first" || wordCompleted) && (
                <div className="rounded-3xl border-4 border-white shadow-2xl drop-shadow-xl overflow-hidden flex items-center justify-center bg-white w-[480px] h-[300px]">
                  <img
                    src={imageSrc}
                    alt={currentWord.word}
                    className="object-contain w-full h-full"
                  />
                </div>
              )}

              {currentWord && mode === "word-first" && !wordCompleted && (
                <div className="w-[480px] h-[300px] rounded-3xl border-4 border-dashed border-primary/30 flex items-center justify-center bg-primary/5">
                  <span className="text-6xl">❓</span>
                </div>
              )}

              <button onClick={goNext} className="absolute right-2 z-10">
                <ChevronRight />
              </button>
            </div>

            {/* RIGHT: WORD INPUT */}
            <div className="w-1/2 flex items-center justify-center px-4">
              <WordInput
                value={currentInput}
                suggestion={suggestion}
                wordLength={currentWord?.word.length || 0}
              />
            </div>
          </div>

          {/* KEYBOARD - FIXED FULL BOTTOM */}
          <div className="fixed bottom-0 left-0 right-0">
            <VirtualKeyboard
              onKeyClick={handleKeyClick}
              onBackspace={handleBackspace}
              onClear={handleClear}
              highlightedKey={highlightedKey}
              layoutMode="ipad-landscape"
            />
          </div>
        </>
      )}

      {/* ========================================
           CELEBRATION BALLOONS
      ======================================== */}
      {showBalloons && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {balloons.filter(b => !b.popped).map((balloon, index) => {
            const colors = [
              { body: "#ff6b6b", knot: "#dc2626", gradient: "url(#gradientRed)" },
              { body: "#60a5fa", knot: "#3b82f6", gradient: "url(#gradientBlue)" },
              { body: "#fbbf24", knot: "#f59e0b", gradient: "url(#gradientYellow)" },
              { body: "#34d399", knot: "#10b981", gradient: "url(#gradientGreen)" }
            ];
            const color = colors[index % 4];
            
            return (
              <div
                key={balloon.id}
                onClick={(e) => handleBalloonPop(balloon.id, e)}
                className="pointer-events-auto cursor-pointer"
                style={{
                  position: 'fixed',
                  left: `${balloon.x}%`,
                  bottom: '-100px',
                  animation: `floatUpSlow 15s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                  animationDelay: `${index * 0.4}s`,
                  width: '120px',
                  height: '200px',
                }}
              >
                <div className="relative w-full h-full flex flex-col items-center group hover:scale-110 transition-transform">
                  {/* Balloon SVG */}
                  <svg width="120" height="140" viewBox="0 0 120 140" className="drop-shadow-2xl flex-shrink-0">
                    {/* Balloon body */}
                    <ellipse 
                      cx="60" 
                      cy="60" 
                      rx="50" 
                      ry="58" 
                      fill={color.gradient}
                      stroke="#fff"
                      strokeWidth="2"
                      className="filter drop-shadow-lg"
                    />
                    {/* Shine effect */}
                    <ellipse 
                      cx="42" 
                      cy="35" 
                      rx="20" 
                      ry="28" 
                      fill="rgba(255, 255, 255, 0.35)"
                    />
                    {/* Balloon knot */}
                    <path 
                      d="M 60 118 Q 55 125 60 130 Q 65 125 60 118" 
                      fill={color.knot}
                    />
                    <defs>
                      <radialGradient id="gradientRed" cx="40%" cy="40%">
                        <stop offset="0%" stopColor="#ff8080" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </radialGradient>
                      <radialGradient id="gradientBlue" cx="40%" cy="40%">
                        <stop offset="0%" stopColor="#93c5fd" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </radialGradient>
                      <radialGradient id="gradientYellow" cx="40%" cy="40%">
                        <stop offset="0%" stopColor="#fcd34d" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </radialGradient>
                      <radialGradient id="gradientGreen" cx="40%" cy="40%">
                        <stop offset="0%" stopColor="#6ee7b7" />
                        <stop offset="100%" stopColor="#10b981" />
                      </radialGradient>
                    </defs>
                  </svg>
                  
                  {/* String */}
                  <div className="w-1 h-16 bg-gradient-to-b from-gray-400 to-gray-600 flex-shrink-0"></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CELEBRATION STARS */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="fixed pointer-events-none z-50 animate-starBurst"
          style={{
            left: `${star.x}px`,
            top: `${star.y}px`,
          }}
        >
          <span className="text-4xl">⭐</span>
        </div>
      ))}

      {/* CONFETTI BURST */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="fixed pointer-events-none z-50"
          style={{
            left: `${piece.x}px`,
            top: `${piece.y}px`,
            animation: `confettiFall 2s ease-in forwards`,
            opacity: 1,
            transform: `translate(${piece.vx * 20}px, ${piece.vy * 20}px) rotate(${Math.random() * 360}deg)`,
          }}
        >
          <span className="text-2xl">{['🎉', '✨', '🌟', '💫', '🎊'][Math.floor(Math.random() * 5)]}</span>
        </div>
      ))}
    </div>
  );
};

export default Learning;
