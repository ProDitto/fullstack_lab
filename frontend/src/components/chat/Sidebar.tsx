import * as React from 'react';
import { Globe, LogOut, Plus, Settings, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/store/chatStore';
import { Button } from '../ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { ScrollArea } from '../ui/ScrollArea';
import { Skeleton } from '../ui/Skeleton';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Chat, User } from '@/types';
import { getChatPartner } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
    onNewChat: () => void;
    onSettings: () => void;
    onCloseSidebar: () => void; // Added for responsive closing
}

/**
 * The main sidebar component, containing the user menu, action icons, and the chat list.
 */
export const Sidebar: React.FC<SidebarProps> = ({ onNewChat, onSettings, onCloseSidebar }) => {
  return (
    // Responsive adjustments are applied by MainLayout's containing aside element
    <div className="flex flex-col h-full">
      <UserMenu onNewChat={onNewChat} onSettings={onSettings} onCloseSidebar={onCloseSidebar} />
      <ChatList />
    </div>
  );
};

/**
 * Renders the user menu at the top of the sidebar.
 * Includes user avatar, name, and a popover for actions like logout.
 */
const UserMenu: React.FC<SidebarProps> = ({ onNewChat, onSettings, onCloseSidebar }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  }

  return (
    <div className="p-2 flex justify-between items-center border-b border-border">
        {/* Close button for mobile sidebar */}
        <div className="md:hidden flex-shrink-0 mr-2">
            <Button variant="ghost" size="icon" onClick={onCloseSidebar} aria-label="Close sidebar">
                <X className="h-5 w-5" />
            </Button>
        </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="w-full justify-start h-auto p-2" aria-label={`Open user menu for ${currentUser?.name || 'current user'}`}>
            <Avatar className="h-9 w-9 mr-3">
              <AvatarImage src={currentUser?.avatar} alt={`Avatar of ${currentUser?.name}`} />
              <AvatarFallback>{currentUser?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-left flex-1 min-w-0"> {/* Use flex-1 min-w-0 for truncation */}
              <p className="font-semibold text-sm truncate text-text-primary">{currentUser?.name}</p>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <Button variant="ghost" className="w-full justify-start" aria-label="View Profile">
            <UserIcon className="mr-2 h-4 w-4" /> View Profile
          </Button>
          <Button variant="ghost" className="w-full justify-start text-status-error hover:text-status-error" onClick={handleLogout} aria-label="Log Out">
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </PopoverContent>
      </Popover>
      <TooltipProvider delayDuration={100}>
        <div className="flex items-center flex-shrink-0">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => {
                        navigate('/open-world');
                        if (window.innerWidth < 768) onCloseSidebar(); // Close sidebar on mobile after navigation
                    }} aria-label="Open World">
                        <Globe className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Open World</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onNewChat} aria-label="Start a new chat">
                        <Plus className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>New Chat</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Open settings">
                        <Settings className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Settings</p></TooltipContent>
            </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
};

/**
 * Renders the scrollable list of chats.
 * Uses Dexie's useLiveQuery for real-time updates.
 */
const ChatList: React.FC = () => {
  const { currentUser } = useAuth();
  const chats = useLiveQuery(
    () => db.chats
        .where('participantIds').equals(currentUser!.id)
        .sortBy('lastMessage.timestamp')
        .then(c => c.reverse()),
    [currentUser?.id], // Depend on currentUser.id for re-fetching
    [] as Chat[]
  );
  
  if (!currentUser) return null;
  const isLoading = chats.length === 0 && (chats as any)._state !== 2; // Check Dexie's internal state for loading

  return (
    <ScrollArea className="flex-1" aria-label="Chat conversations">
      {isLoading && <ChatListSkeleton />}
      {!isLoading && chats.length === 0 && (
        <div className="p-4 text-center text-sm text-text-secondary" role="alert">
          No chats yet. Start a new conversation!
        </div>
      )}
      {!isLoading && chats.map(chat => (
        <ChatItem key={chat.id} chat={chat} currentUserId={currentUser.id} />
      ))}
    </ScrollArea>
  );
};

/**
 * Renders a single chat item in the chat list.
 */
const ChatItem: React.FC<{ chat: Chat; currentUserId: string }> = ({ chat, currentUserId }) => {
  const { activeChatId, setActiveChatId } = useChatStore();
  const [partner, setPartner] = React.useState<User | null>(null);

  React.useEffect(() => {
    if (!chat.isGroup) {
      getChatPartner(chat, currentUserId).then(p => setPartner(p || null));
    }
  }, [chat, currentUserId]);

  const displayName = chat.isGroup ? chat.name : partner?.name;
  const displayAvatar = chat.isGroup ? chat.avatar : partner?.avatar;
  const isActive = chat.id === activeChatId;
  
  // When a chat is active, its unread count should be 0.
  const unreadCount = isActive ? 0 : chat.unreadCount;

  return (
    <Button
      variant="ghost"
      onClick={() => setActiveChatId(chat.id)}
      className={cn(
        "w-full h-auto p-2 justify-start rounded-none",
        isActive && "bg-primary-accent/10"
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-label={`Open chat with ${displayName || 'unknown user'}${unreadCount > 0 ? `, ${unreadCount} unread messages` : ''}`}
    >
      <Avatar className="h-11 w-11 mr-3">
        <AvatarImage src={displayAvatar} alt={`Avatar of ${displayName}`} loading="lazy" />
        <AvatarFallback>{displayName?.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="w-full overflow-hidden">
        <div className="flex justify-between items-center">
          <p className="font-semibold text-sm truncate text-text-primary">{displayName || '...'}</p>
          {chat.lastMessage && <p className="text-xs text-text-secondary">{timeAgo(chat.lastMessage.timestamp)}</p>}
        </div>
        <div className="flex justify-between items-start">
          <p className="text-xs text-text-secondary truncate pr-2">
            {chat.lastMessage?.content || 'No messages yet'}
          </p>
          {unreadCount > 0 && (
             <span className="bg-primary-accent text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center" aria-label={`${unreadCount} unread messages`}>
                {unreadCount}
             </span>
          )}
        </div>
      </div>
    </Button>
  );
};

/**
 * Renders a skeleton loading state for the chat list.
 */
const ChatListSkeleton: React.FC = () => {
    return (
        <div className="p-2 space-y-2" role="progressbar" aria-label="Loading chats">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center p-2">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <div className="ml-3 space-y-2 w-full">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-2/5" />
                            <Skeleton className="h-3 w-1/5" />
                        </div>
                        <Skeleton className="h-3 w-4/5" />
                    </div>
                </div>
            ))}
        </div>
    )
}
