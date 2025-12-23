import { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { THEMES, getTheme, setTheme, type ThemeName } from "@/storage/theme";

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(getTheme());

  useEffect(() => {
    setCurrentTheme(getTheme());
  }, []);

  const handleThemeChange = (themeId: ThemeName) => {
    setTheme(themeId);
    setCurrentTheme(themeId);
    // Force a small delay to ensure theme is applied
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full"
          title="Change Theme"
        >
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {THEMES.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className={`cursor-pointer ${
              currentTheme === theme.id ? "bg-primary/10" : ""
            }`}
          >
            <span className="text-2xl mr-3">{theme.emoji}</span>
            <div className="flex flex-col">
              <span className="font-semibold">{theme.name}</span>
              <span className="text-xs text-muted-foreground">
                {theme.description}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
