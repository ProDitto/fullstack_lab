import { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';

/**
 * Custom hook to manage theme application and fetching custom themes on application load.
 */
export const useTheme = () => {
  const { currentThemeId, setTheme, fetchCustomThemes } = useThemeStore();

  useEffect(() => {
    // Apply initial theme and fetch custom themes on mount
    fetchCustomThemes().then(() => {
        setTheme(currentThemeId); // Re-apply the last set theme (default or custom)
    });
  }, [currentThemeId, setTheme, fetchCustomThemes]);

  return { currentThemeId, setTheme };
};
