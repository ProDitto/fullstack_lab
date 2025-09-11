import { create } from 'zustand';
import type { ThemeConfig } from '../types';
import * as api from '../lib/api';

interface ThemeState {
    currentThemeId: string;
    customThemes: ThemeConfig[];
    fetchCustomThemes: () => Promise<void>;
    setTheme: (themeId: string) => void;
    addCustomTheme: (theme: Omit<ThemeConfig, 'id'>) => Promise<void>;
}

// Helper to convert hex to RGB values for CSS variables
const hexToRgb = (hex: string) => {
  let c: any = hex.substring(1).split('');
  if (c.length === 3) { c = [c[0], c[0], c[1], c[1], c[2], c[2]]; }
  c = '0x' + c.join('');
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(' ');
};

// Applies a custom theme by setting CSS variables
const applyCustomTheme = (theme: ThemeConfig) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark'); // Remove base themes

    // Set custom class for the theme
    root.classList.add(`theme-custom-${theme.id}`);

    // Apply colors as CSS variables
    Object.entries(theme.colors).forEach(([category, values]) => {
        Object.entries(values).forEach(([key, value]) => {
            const varName = `--color-${category}-${key}`;
            if (typeof value === 'string') {
                 root.style.setProperty(varName, hexToRgb(value));
            }
        });
    });
};

// Resets custom CSS variables (important when switching away from a custom theme)
const resetCustomThemeVariables = () => {
    const root = document.documentElement;
    const currentThemeClass = Array.from(root.classList).find(cls => cls.startsWith('theme-custom-'));
    if (currentThemeClass) {
        root.classList.remove(currentThemeClass);
    }
    // A more robust reset would iterate all possible custom variables and remove them
    // For now, we rely on the default styles of 'light' or 'dark' to override.
    root.style.cssText = '';
};


export const useThemeStore = create<ThemeState>((set, get) => ({
    currentThemeId: localStorage.getItem('themeId') || 'light', // Persist last chosen theme
    customThemes: [],

    fetchCustomThemes: async () => {
        try {
            const themes = await api.getThemes();
            set({ customThemes: themes });
        } catch (error) {
            console.error("Failed to fetch custom themes:", error);
        }
    },

    setTheme: (themeId: string) => {
        localStorage.setItem('themeId', themeId);
        const root = document.documentElement;
        
        resetCustomThemeVariables(); // Always reset custom variables first

        if (themeId === 'light' || themeId === 'dark') {
            // Apply base themes
            root.classList.remove('light', 'dark');
            root.classList.add(themeId);
        } else {
            // Apply custom theme
            const customTheme = get().customThemes.find(t => t.id === themeId);
            if (customTheme) {
                applyCustomTheme(customTheme);
            } else {
                // Fallback to light if custom theme not found
                root.classList.add('light');
                set({ currentThemeId: 'light' });
            }
        }
        set({ currentThemeId: themeId });
    },

    addCustomTheme: async (themeData) => {
        try {
            const newTheme = await api.saveTheme(themeData);
            set(state => ({ customThemes: [...state.customThemes, newTheme] }));
            get().setTheme(newTheme.id); // Apply the new theme immediately
        } catch (error) {
            console.error("Failed to save custom theme:", error);
            throw error; // Re-throw for UI to handle
        }
    },
}));
