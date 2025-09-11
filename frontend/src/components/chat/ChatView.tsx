import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useChatStore } from '@/store/chatStore';
import { useAuth } from '@/hooks/useAuth';
import type { Chat, User, Message as MessageType } from '@/types';
import { db } from '@/lib/db';
import { getChatPartner } from '@/lib/api';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { GroupSettingsDialog } from './GroupSettingsDialog';


/**
 * The main view for a single chat conversation, including header, virtualized message list, and input.
 */
export const ChatView: React.FC = () => {
    const { activeChatId } = useChatStore();
    const { currentUser } = useAuth();
    const [chatInfo, setChatInfo] = React.useState<{ name: string; avatar?: string; status: string; isGroup: boolean } | null>(null);
    const [isGroupSettingsOpen, setIsGroupSettingsOpen] = React.useState(false);

    React.useEffect(() => {
        const fetchChatInfo = async () => {
            if (!activeChatId || !currentUser) return;
            const chat = await db.chats.get(activeChatId);
            if (!chat) return;

            if (chat.isGroup) {
                // Fetch all participant details for group chat for robust display
                const participants = await db.users.bulkGet(chat.participantIds);
                const participantNames = participants.filter(Boolean).map(p => p!.name);

                setChatInfo({
                    name: chat.name || 'Group Chat',
                    avatar: chat.avatar,
                    status: `${participantNames.length} members`,
                    isGroup: true,
                });
            } else {
                const partner = await getChatPartner(chat, currentUser.id);
                setChatInfo({
                    name: partner?.name || 'Unknown User',
                    avatar: partner?.avatar,
                    status: partner?.isOnline ? 'Online' : 'Offline',
                    isGroup: false,
                });
            }
        };
        fetchChatInfo();
    }, [activeChatId, currentUser]);

    if (!activeChatId) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-text-secondary">
                <p>No chat selected.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full" aria-label={`Chat with ${chatInfo?.name || 'Loading...'}`}>
            <ChatHeader
                info={chatInfo}
                isGroup={chatInfo?.isGroup}
                onHeaderClick={() => chatInfo?.isGroup && setIsGroupSettingsOpen(true)}
            />
            <MessageList />
            <MessageInput />
            {chatInfo?.isGroup && activeChatId && (
                <GroupSettingsDialog
                    chatId={activeChatId}
                    isOpen={isGroupSettingsOpen}
                    onOpenChange={setIsGroupSettingsOpen}
                />
            )}
        </div>
    );
};

interface ChatHeaderProps {
    info: { name: string; avatar?: string; status: string; isGroup?: boolean } | null;
    isGroup?: boolean;
    onHeaderClick: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ info, isGroup, onHeaderClick }) => {
    if (!info) {
        return (
            <div className="p-4 border-b border-border flex items-center bg-background-primary">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="ml-3 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>
        );
    }

    const headerContent = (
        <div className="flex items-center flex-1 min-w-0">
            <Avatar className="h-9 w-9">
                <AvatarImage src={info.avatar} alt={`Avatar of ${info.name}`} />
                <AvatarFallback>{info.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="ml-3 flex-1 min-w-0">
                <p className="font-semibold text-text-primary truncate">{info.name}</p>
                <p className="text-xs text-text-secondary truncate">{info.status}</p>
            </div>
        </div>
    );

    return (
        <div className="p-2 border-b border-border bg-background-primary flex items-center" role="banner">
            {isGroup ? (
                <button
                    onClick={onHeaderClick}
                    className="w-full text-left rounded-md hover:bg-background-secondary p-2 -m-2 flex items-center"
                    aria-label={`Open settings for group chat ${info.name}`}
                >
                    {headerContent}
                </button>
            ) : (
                <div className="w-full p-2 -m-2">
                    {headerContent}
                </div>
            )}
        </div>
    );
};

const MessageList: React.FC = () => {
    const { messages, messagesLoading, hasMoreMessages, loadMoreMessages } = useChatStore();
    const parentRef = React.useRef<HTMLDivElement>(null);
    const count = messages.length;

    const rowVirtualizer = useVirtualizer({
        count,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 70, // Estimate row height
        overscan: 5,
        scrollToFn: (offset, options, instance) => {
            const scrollElement = instance.scrollElement;

            if (scrollElement) {
                const isAtBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < 1;

                // Decide on 'auto' vs 'smooth' behavior based on scroll position and loading state
                const behavior = (isAtBottom || (offset > scrollElement.scrollTop && messages.length > 0))
                    ? 'auto' // Disable smooth scroll when dynamic height/loading
                    : 'auto'; // Or fallback to 'auto' if you don't want smooth

                scrollElement.scrollTo({
                    top: offset + (options.adjustments ?? 0),
                    behavior,
                });
            }
        },
    });
    
    // Scroll to bottom when new messages are added, but only if already at bottom or new messages are from me
    const isAtBottom = React.useRef(true);
    React.useLayoutEffect(() => {
        const scrollElement = parentRef.current;
        if (scrollElement) {
            isAtBottom.current = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < 10; // Threshold
        }
    }, [messages]);

    React.useEffect(() => {
        if (rowVirtualizer && count > 0 && isAtBottom.current) {
            rowVirtualizer.scrollToIndex(count - 1, { align: 'end', behavior: 'smooth' });
        }
    }, [count, rowVirtualizer]);

    const handleScroll = React.useCallback(() => {
        const scrollElement = parentRef.current;
        if (scrollElement) {
            const scrollTop = scrollElement.scrollTop;
            // If scrolled near the top and there are more messages to load
            if (scrollTop < 100 && hasMoreMessages && !messagesLoading) {
                loadMoreMessages();
            }
        }
    }, [hasMoreMessages, messagesLoading, loadMoreMessages]);

    React.useEffect(() => {
        const scrollElement = parentRef.current;
        scrollElement?.addEventListener('scroll', handleScroll);
        return () => scrollElement?.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);


    return (
        <div ref={parentRef} className="flex-1 overflow-y-auto p-4 flex flex-col-reverse" aria-label="Message history">
            {messagesLoading && messages.length === 0 && <div className="flex justify-center items-center h-full"><Spinner /></div>}

            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {hasMoreMessages && (
                    <div className="flex justify-center py-2" role="status">
                        <Button variant="outline" size="sm" onClick={loadMoreMessages} disabled={messagesLoading}>
                            {messagesLoading ? <Spinner size="sm" /> : 'Load More'}
                        </Button>
                    </div>
                )}

                {rowVirtualizer.getVirtualItems().map(virtualItem => {
                    const message = messages[virtualItem.index];
                    // Logic to determine if avatar should be shown (e.g., if sender changes or it's the first message)
                    const prevMessage = messages[virtualItem.index - 1];
                    const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId || (message.timestamp.getTime() - prevMessage.timestamp.getTime() > 1000 * 60 * 5); // New sender or 5 min gap

                    return (
                        <div
                            key={virtualItem.key}
                            data-index={virtualItem.index} // For debugging virtualizer
                            ref={rowVirtualizer.measureElement} // Essential for dynamic row heights
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualItem.start}px)`, // No height here, let content dictate
                            }}
                        >
                            <Message message={message} showAvatar={showAvatar} />
                        </div>
                    );
                })}
            </div>
            {!messagesLoading && messages.length === 0 && (
                <div className="text-center text-text-secondary py-4" role="status">No messages yet. Say hello!</div>
            )}
        </div>
    );
};
