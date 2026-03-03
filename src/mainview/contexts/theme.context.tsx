import { createContext, type ReactNode, use, useEffect, useState } from "react";

export type UserTheme = "light" | "dark" | "system";
export type AppTheme = Exclude<UserTheme, "system">;

function handleThemeChange(userTheme: UserTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark", "system");
  const newTheme = userTheme === "system" ? getSystemTheme() : userTheme;
  root.classList.add(newTheme);

  if (userTheme === "system") {
    root.classList.add("system");
  }
}

function getSystemTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const themeStorageKey = "ui-theme";

function getStoredUserTheme(): UserTheme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(themeStorageKey);
    return stored && ["light", "dark", "system"].includes(stored)
      ? (stored as UserTheme)
      : "system";
  } catch {
    return "system";
  }
}

function setStoredTheme(theme: UserTheme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {}
}

function setupPreferredListener() {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => handleThemeChange("system");
  mediaQuery.addEventListener("change", handler);
  return () => mediaQuery.removeEventListener("change", handler);
}

type ThemeContextProps = {
  userTheme: UserTheme;
  appTheme: AppTheme;
  setTheme: (theme: UserTheme) => void;
};
const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [userTheme, setUserTheme] = useState<UserTheme>(getStoredUserTheme);

  useEffect(() => {
    if (userTheme !== "system") return;
    return setupPreferredListener();
  }, [userTheme]);

  const appTheme = userTheme === "system" ? getSystemTheme() : userTheme;

  const setTheme = (newUserTheme: UserTheme) => {
    setUserTheme(newUserTheme);
    setStoredTheme(newUserTheme);
    handleThemeChange(newUserTheme);
  };

  return <ThemeContext value={{ appTheme, setTheme, userTheme }}>{children}</ThemeContext>;
}

export const useTheme = () => {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
