"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "baseline-theme";
const EVENT = "baseline-theme-change";

/**
 * Runs before paint so the stored theme is applied without a flash.
 * Kept as a string so it can be inlined in the root layout's <head>.
 */
export const themeScript = `
(function(){try{
  var t=localStorage.getItem('${STORAGE_KEY}');
  if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);
}catch(e){}})();
`;

/**
 * The DOM attribute is the source of truth, not React state — the inline
 * script above sets it before React exists. Reading it through
 * useSyncExternalStore keeps the two in step without a setState-in-effect.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function getSnapshot(): Theme {
  const value = document.documentElement.getAttribute("data-theme");
  return value === "light" || value === "dark" ? value : "system";
}

function getServerSnapshot(): Theme {
  return "system";
}

const GLYPH: Record<Theme, string> = {
  system: "◐",
  light: "☼",
  dark: "☾",
};

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function cycle() {
    const order: Theme[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(theme) + 1) % order.length];

    if (next === "system") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem(STORAGE_KEY);
    } else {
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(STORAGE_KEY, next);
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${theme}. Click to change.`}
      title={`Theme: ${theme}`}
      className="flex h-9 w-9 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
    >
      {/* The server cannot know the stored theme; the glyph settles on hydration. */}
      <span aria-hidden suppressHydrationWarning className="text-sm">
        {GLYPH[theme]}
      </span>
    </button>
  );
}
