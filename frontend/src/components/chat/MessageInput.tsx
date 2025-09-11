import * as React from 'react';
import { Smile, Send } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { Button } from '../ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';

// Simple list of emojis for the picker
const EMOJIS = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🙏', '🎉', '🔥', '💯', '✨', '👋', '🙏', '🤯', '🥳'];

/**
 * Renders the message input component with an emoji picker and send button.
 */
export const MessageInput: React.FC = () => {
    const [message, setMessage] = React.useState('');
    const sendMessage = useChatStore((state) => state.sendMessage);
    const { currentUser } = useAuthStore();
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);

    const handleSend = () => {
        if (message.trim() && currentUser) {
            sendMessage(message);
            setMessage('');
            setIsEmojiPickerOpen(false); // Close picker after sending
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            handleSend();
        }
    };

    const addEmoji = (emoji: string) => {
        setMessage(prev => prev + emoji);
        // Optionally keep picker open for multiple emojis, or close it here
        // setIsEmojiPickerOpen(false);
    };

    return (
        <div className="p-4 bg-background-secondary border-t border-border flex items-end gap-2" role="form" aria-label="Message composer">
            <div className="flex-1 flex items-center bg-background-primary rounded-lg border border-border p-1">
                <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 flex-shrink-0"
                            aria-label="Open emoji picker"
                            disabled={!currentUser}
                        >
                            <Smile className="h-5 w-5 text-text-secondary" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" side="top" align="start">
                        <div className="grid grid-cols-6 gap-1 max-w-[200px]">
                            {EMOJIS.map(emoji => (
                                <button 
                                    key={emoji} 
                                    onClick={() => addEmoji(emoji)} 
                                    className="text-2xl rounded-md hover:bg-background-secondary p-1"
                                    aria-label={`Insert emoji ${emoji}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                <TextareaAutosize
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={currentUser ? "Type a message..." : "Log in to send messages"}
                    maxRows={5}
                    className="flex-1 bg-transparent resize-none focus:outline-none text-sm mx-2 py-1.5"
                    aria-label="Message content"
                    disabled={!currentUser}
                />
            </div>
            <Button 
                onClick={handleSend} 
                size="icon" 
                disabled={!message.trim() || !currentUser}
                aria-label="Send message"
            >
                <Send className="h-5 w-5" />
            </Button>
        </div>
    );
};
