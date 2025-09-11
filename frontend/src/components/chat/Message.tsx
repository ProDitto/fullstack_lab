import * as React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message as MessageType, MessageStatus, User } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import { db } from '@/lib/db';

interface MessageProps {
    message: MessageType;
    showAvatar: boolean;
}

/**
 * Renders a single chat message bubble with appropriate styling for sender, status, and content.
 */
export const Message: React.FC<MessageProps> = React.memo(({ message, showAvatar }) => {
    const { currentUser } = useAuthStore();
    const [sender, setSender] = React.useState<User | null>(null);

    const isCurrentUser = message.senderId === currentUser?.id;
    const isEvent = message.isEvent;

    // Fetch sender details only if it's not the current user and not a system message
    React.useEffect(() => {
        if (!isCurrentUser && !isEvent && message.senderId && message.senderId !== 'system') {
            db.users.get(message.senderId).then(user => setSender(user || null));
        }
    }, [message.senderId, isCurrentUser, isEvent]);

    if (isEvent) {
        return (
            <div className="text-center text-xs text-text-secondary my-2" role="log" aria-live="polite">
                {message.content}
            </div>
        );
    }

    const messageDate = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tooltipDate = message.timestamp.toLocaleString();

    return (
        <div 
            className={cn("flex items-end gap-2 my-1", isCurrentUser ? "justify-end" : "justify-start")}
            role="listitem"
            aria-label={`Message from ${isCurrentUser ? 'you' : sender?.name || 'unknown user'} at ${tooltipDate}`}
        >
            {!isCurrentUser && (
                <div className="w-8 flex-shrink-0">
                    {showAvatar && sender && (
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={sender.avatar} alt={`Avatar of ${sender.name}`} loading="lazy" />
                            <AvatarFallback>{sender.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    )}
                </div>
            )}
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <div className={cn(
                            "max-w-[70%] p-2 px-3 rounded-lg flex flex-col break-words",
                            isCurrentUser ? "bg-primary-accent text-white rounded-br-none" : "bg-background-secondary text-text-primary rounded-bl-none",
                            isCurrentUser && !showAvatar && "mr-8", // Push my message left if no avatar placeholder
                            !isCurrentUser && !showAvatar && "ml-8" // Push other's message right if no avatar placeholder
                        )}>
                            {!isCurrentUser && showAvatar && sender && (
                                <p className="text-xs font-semibold text-secondary-accent mb-1" aria-hidden="true">{sender.name}</p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <div className="flex items-center justify-end gap-1 self-end mt-1 text-xs opacity-70">
                                <span aria-hidden="true">{messageDate}</span>
                                {isCurrentUser && <MessageStatusIcon status={message.status} />}
                            </div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{tooltipDate}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            {isCurrentUser && ( // Add empty div for alignment if my avatar is not shown
                 <div className="w-8 flex-shrink-0">
                    {showAvatar && currentUser && (
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={currentUser.avatar} alt={`Avatar of ${currentUser.name}`} loading="lazy" />
                            <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    )}
                </div>
            )}
        </div>
    );
});
Message.displayName = 'Message'; // For React DevTools

const MessageStatusIcon: React.FC<{ status?: MessageStatus }> = ({ status }) => {
    if (status === 'sent') return <Check className="h-4 w-4" aria-label="Message sent" />;
    if (status === 'delivered') return <CheckCheck className="h-4 w-4" aria-label="Message delivered" />;
    if (status === 'seen') return <CheckCheck className="h-4 w-4 text-blue-400" aria-label="Message seen" />;
    return null;
};
