// Theme storage and management

export type ThemeName = "default" | "ocean" | "forest" | "sunset" | "candy";

export interface Theme {
  id: ThemeName;
  name: string;
  emoji: string;
  description: string;
}

export const THEMES: Theme[] = [
  {
    id: "default",
    name: "Rainbow Fun",
    emoji: "🌈",
    description: "Classic colorful theme",
  },
  {
    id: "ocean",
    name: "Ocean Adventure",
    emoji: "🌊",
    description: "Cool blues and waves",
  },
  {
    id: "forest",
    name: "Forest Friends",
    emoji: "🌲",
    description: "Fresh greens and nature",
  },
  {
    id: "sunset",
    name: "Sunset Magic",
    emoji: "🌅",
    description: "Warm oranges and pinks",
  },
  {
    id: "candy",
    name: "Candy Land",
    emoji: "🍭",
    description: "Sweet pinks and purples",
  },
];

const THEME_KEY = "app-theme";

export function getTheme(): ThemeName {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored && THEMES.some(t => t.id === stored)) {
    return stored as ThemeName;
  }
  return "default";
}

export function setTheme(theme: ThemeName): void {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme: ThemeName): void {
  // Remove all theme classes
  THEMES.forEach(t => {
    document.documentElement.classList.remove(`theme-${t.id}`);
  });
  
  // Add the selected theme class
  document.documentElement.classList.add(`theme-${theme}`);
  
  // Debug: log to console
  console.log(`Theme applied: ${theme}`, document.documentElement.className);
}

// Initialize theme on load
export function initTheme(): void {
  const theme = getTheme();
  applyTheme(theme);
}
