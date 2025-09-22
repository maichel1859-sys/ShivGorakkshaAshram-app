"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Hook for theme-aware components that need to react to theme changes
 * Provides resolved theme state and helper utilities
 */
export function useThemeAware() {
  const { theme, systemTheme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = resolvedTheme === "light";
  const isDark = resolvedTheme === "dark";
  const isSystem = theme === "system";

  // Provide theme-aware class names
  const getThemeClass = (lightClass: string, darkClass: string) => {
    if (!mounted) return lightClass; // Default to light during SSR
    return isDark ? darkClass : lightClass;
  };

  // Provide theme-aware values
  const getThemeValue = <T>(lightValue: T, darkValue: T): T => {
    if (!mounted) return lightValue; // Default to light during SSR
    return isDark ? darkValue : lightValue;
  };

  // Theme toggle utilities
  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const setLightTheme = () => setTheme("light");
  const setDarkTheme = () => setTheme("dark");
  const setSystemTheme = () => setTheme("system");

  return {
    // State
    theme,
    systemTheme,
    resolvedTheme,
    mounted,
    isLight,
    isDark,
    isSystem,

    // Utilities
    getThemeClass,
    getThemeValue,

    // Actions
    setTheme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
  };
}

/**
 * Hook for getting theme-aware icons
 */
export function useThemeAwareIcons() {
  const { getThemeValue, mounted } = useThemeAware();

  const getIcon = (lightIcon: React.ReactNode, darkIcon: React.ReactNode) => {
    return getThemeValue(lightIcon, darkIcon);
  };

  return {
    getIcon,
    mounted,
  };
}

/**
 * Theme-aware component wrapper props
 */
export interface ThemeAwareProps {
  lightClassName?: string;
  darkClassName?: string;
  lightStyle?: React.CSSProperties;
  darkStyle?: React.CSSProperties;
}

/**
 * Hook for theme-aware styling
 */
export function useThemeAwareStyling(props: ThemeAwareProps) {
  const { getThemeClass, getThemeValue } = useThemeAware();

  const className = getThemeClass(
    props.lightClassName || "",
    props.darkClassName || ""
  );

  const style = getThemeValue(
    props.lightStyle || {},
    props.darkStyle || {}
  );

  return {
    className,
    style,
  };
}