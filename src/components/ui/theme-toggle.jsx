"use client";
import React from "react";
import { useStore } from "@nanostores/react";
import { $theme, setTheme } from "@/stores/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor, Check } from "lucide-react";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function ThemeToggle() {
  const theme = useStore($theme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="relative h-12 w-12 bg-card/55 backdrop-blur-xl dark:text-white text-foreground border border-border hover:border-[hsl(var(--accent-1)/0.5)] hover:bg-card/60 transition-all duration-200 rounded-2xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          aria-label="Toggle theme"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 top-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent, #22d3eecc, transparent)",
            }}
          />
          {theme === "light" && <Sun className="h-5 w-5" />}
          {theme === "dark" && <Moon className="h-5 w-5" />}
          {theme === "system" && <Monitor className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              "flex items-center gap-2",
              theme === t.value && "bg-accent text-accent-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            <span>{t.label}</span>
            {theme === t.value && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
