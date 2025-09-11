import * as React from 'react';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import type { ThemeConfig } from '@/types';
import { HexColorPicker } from 'react-colorful'; // Assuming react-colorful is installed
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { Palette, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';
import { Spinner } from '../ui/Spinner';

// Define the structure for default colors to allow for easy reset
const DEFAULT_COLORS: ThemeConfig['colors'] = {
  background: { primary: '#ffffff', secondary: '#f1f5f9' },
  text: { primary: '#020817', secondary: '#64748b' },
  border: '#e2e8f0',
  primary: { accent: '#2563eb' },
  secondary: { accent: '#475569' },
  status: { success: '#22c55e', warning: '#f97316', error: '#ef4444', info: '#3b82f6' },
};

// Helper component for color picking
interface ColorPickerInputProps {
    label: string;
    color: string;
    onChange: (color: string) => void;
}

const ColorPickerInput: React.FC<ColorPickerInputProps> = ({ label, color, onChange }) => {
    const [pickerOpen, setPickerOpen] = React.useState(false);
    return (
        <div className="flex items-center justify-between text-sm">
            <label htmlFor={`color-picker-${label}`} className="capitalize">{label.replace('.', ' ')}</label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                    <Button 
                        variant="outline" 
                        className="w-10 h-10 p-0" 
                        style={{ backgroundColor: color }}
                        aria-label={`Select color for ${label}`}
                    >
                        <span className="sr-only">{color}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <HexColorPicker color={color} onChange={onChange} />
                </PopoverContent>
            </Popover>
        </div>
    );
};

export const ThemeSwitcher: React.FC = () => {
    const { currentThemeId, customThemes, addCustomTheme, setTheme, fetchCustomThemes } = useThemeStore();
    const [newThemeName, setNewThemeName] = React.useState('');
    const [newThemeColors, setNewThemeColors] = React.useState(DEFAULT_COLORS);
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        fetchCustomThemes(); // Ensure custom themes are loaded
    }, [fetchCustomThemes]);

    const handleColorChange = (category: keyof ThemeConfig['colors'], key: string, value: string) => {
        setNewThemeColors(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key as keyof typeof prev[typeof category]]: value,
            },
        }));
    };
    
    const handleSaveTheme = async () => {
        if (!newThemeName.trim()) {
            alert("Please provide a name for your custom theme.");
            return;
        }
        setIsSaving(true);
        try {
            await addCustomTheme({ name: newThemeName, colors: newThemeColors });
            setNewThemeName('');
            setNewThemeColors(DEFAULT_COLORS); // Reset to default for next theme
            alert("Custom theme saved and applied!");
        } catch (error) {
            console.error("Failed to save custom theme:", error);
            alert("Failed to save custom theme.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold mb-2 text-text-primary">Base Themes</h3>
                <div className="flex flex-wrap gap-2">
                    <Button 
                        variant={currentThemeId === 'light' ? 'default' : 'outline'} 
                        onClick={() => setTheme('light')}
                        aria-pressed={currentThemeId === 'light'}
                    >
                        Light
                    </Button>
                    <Button 
                        variant={currentThemeId === 'dark' ? 'default' : 'outline'} 
                        onClick={() => setTheme('dark')}
                        aria-pressed={currentThemeId === 'dark'}
                    >
                        Dark
                    </Button>
                </div>
            </div>
            
            <div>
                 <h3 className="font-semibold mb-2 text-text-primary">Custom Themes</h3>
                 {customThemes.length === 0 && <p className="text-sm text-text-secondary">No custom themes saved yet.</p>}
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {customThemes.map(theme => (
                        <Button 
                            key={theme.id} 
                            variant={currentThemeId === theme.id ? 'default' : 'secondary'} 
                            onClick={() => setTheme(theme.id)}
                            aria-pressed={currentThemeId === theme.id}
                            className="flex flex-col h-auto p-2"
                        >
                            <span className="font-medium">{theme.name}</span>
                            <div className="flex gap-1 mt-1">
                                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.background.primary }} title="Background Primary"></span>
                                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.primary.accent }} title="Primary Accent"></span>
                            </div>
                        </Button>
                    ))}
                 </div>
            </div>

            <Card className="p-4">
                <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-xl">Create New Theme</CardTitle>
                    <CardDescription>Design your own color palette for QuikChat.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                    <Input 
                        placeholder="Theme Name" 
                        value={newThemeName} 
                        onChange={e => setNewThemeName(e.target.value)} 
                        aria-label="New theme name"
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {Object.entries(newThemeColors).map(([category, values]) => 
                            Object.entries(values).map(([key, value]) => (
                                 <ColorPickerInput 
                                    key={`${category}-${key}`}
                                    label={`${category}.${key}`}
                                    color={value as string}
                                    onChange={color => handleColorChange(category as keyof ThemeConfig['colors'], key, color)}
                                />
                            ))
                        )}
                    </div>
                    <Button 
                        onClick={handleSaveTheme} 
                        className="w-full mt-4" 
                        disabled={isSaving || !newThemeName.trim()}
                        aria-label="Save custom theme"
                    >
                        {isSaving ? <Spinner size="sm" /> : <><Plus className="h-4 w-4 mr-2" />Save Theme</>}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
