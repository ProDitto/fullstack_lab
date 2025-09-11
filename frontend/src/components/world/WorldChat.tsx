import * as React from 'react';
import { Button } from '../ui/Button';
import { MessageSquare, X, Send } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/Card';
import { useWorldStore } from '@/store/worldStore';
import TextareaAutosize from 'react-textarea-autosize';
import { ScrollArea } from '../ui/ScrollArea';
import { db } from '@/lib/db';
import type { User } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { timeAgo } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';


export const WorldChat: React.FC = () => {
    const [isOpen, setIsOpen] = React.useState(true);
    const { worldChatMessages, sendWorldMessage } = useWorldStore();
    const { currentUser } = useAuthStore();
    const [message, setMessage] = React.useState('');
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);
    const [senders, setSenders] = React.useState<Record<string, User>>({});

    // Fetch sender details for messages
    React.useEffect(() => {
        const fetchSenders = async () => {
            const senderIds = [...new Set(worldChatMessages.map(m => m.senderId))];
            const newSenders: Record<string, User> = {};
            for (const id of senderIds) {
                if (id !== 'system' && !senders[id]) { // Only fetch if not system and not already fetched
                    const user = await db.users.get(id);
                    if (user) newSenders[id] = user;
                }
            }
            if (Object.keys(newSenders).length > 0) {
                setSenders(prev => ({ ...prev, ...newSenders }));
            }
        };
        fetchSenders();
    }, [worldChatMessages, senders]); // Rerun when messages or existing senders change

    // Auto-scroll to bottom
    React.useLayoutEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [worldChatMessages]);

    const handleSend = () => {
        if (message.trim()) {
            sendWorldMessage(message);
            setMessage('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) {
        return (
            <Button 
                className="fixed bottom-4 right-4 z-20 md:absolute" 
                size="icon" 
                onClick={() => setIsOpen(true)}
                aria-label="Open world chat"
            >
                <MessageSquare className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-4 right-4 z-20 w-80 h-[50vh] flex flex-col md:absolute" aria-label="World chat panel">
            <CardHeader className="p-2 flex-row items-center justify-between border-b border-border">
                <p className="font-semibold text-text-primary">World Chat</p>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsOpen(false)}
                    aria-label="Close world chat"
                >
                    <X className="h-4 w-4"/>
                </Button>
            </CardHeader>
            <CardContent className="flex-1 p-2 overflow-hidden">
                <ScrollArea className="h-full" viewportRef={scrollAreaRef} aria-label="World chat messages display area">
                    <div className="p-2 space-y-2">
                    {worldChatMessages.map(msg => (
                        <div key={msg.id} className="flex items-start gap-2">
                           {msg.senderId !== 'system' && (
                                <Avatar className="h-6 w-6 flex-shrink-0">
                                    <AvatarImage src={senders[msg.senderId]?.avatar} alt={`Avatar of ${senders[msg.senderId]?.name}`} loading="lazy" />
                                    <AvatarFallback className="text-xs">{senders[msg.senderId]?.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                           )}
                           <div className="flex flex-col flex-1 min-w-0">
                               <TooltipProvider>
                                   <Tooltip>
                                       <TooltipTrigger asChild>
                                           <span className="text-sm break-words">
                                               <span className="font-bold text-primary-accent">{senders[msg.senderId]?.name || 'System'}: </span>
                                               {msg.content}
                                           </span>
                                       </TooltipTrigger>
                                       <TooltipContent>
                                           <p>{msg.timestamp.toLocaleString()}</p>
                                       </TooltipContent>
                                   </Tooltip>
                               </TooltipProvider>
                               <span className="text-xs text-text-secondary opacity-70 ml-auto flex-shrink-0">{timeAgo(msg.timestamp)}</span>
                           </div>
                        </div>
                    ))}
                    {!worldChatMessages.length && (
                        <div className="text-center text-sm text-text-secondary py-4" role="status">No messages in this world yet. Say hello!</div>
                    )}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="p-2 border-t border-border">
                <TextareaAutosize
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Say something..."
                    className="flex-1 bg-background-primary p-2 rounded-md border border-border resize-none focus:outline-none focus:ring-1 focus:ring-primary-accent text-sm mr-2"
                    aria-label="Message input for world chat"
                    disabled={!currentUser}
                />
                <Button onClick={handleSend} size="icon" disabled={!message.trim() || !currentUser} aria-label="Send message">
                    <Send className="h-5 w-5" />
                </Button>
            </CardFooter>
        </Card>
    );
};
