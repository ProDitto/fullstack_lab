import * as React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/Dialog';
import { Button } from '../ui/Button';
import { useFriendStore } from '@/store/friendStore';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import { Input } from '../ui/Input';
import { useChatStore } from '@/store/chatStore';
import { Plus } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import { ScrollArea } from '../ui/ScrollArea';

interface CreateChatDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export const CreateChatDialog: React.FC<CreateChatDialogProps> = ({ isOpen, onOpenChange }) => {
    const { myFriends, fetchMyFriends, isLoading: friendsLoading } = useFriendStore();
    const { currentUser } = useAuth();
    const setActiveChatId = useChatStore(state => state.setActiveChatId);

    const [selectedFriendIds, setSelectedFriendIds] = React.useState<string[]>([]);
    const [step, setStep] = React.useState(1); // 1: Select friends, 2: Name group
    const [groupName, setGroupName] = React.useState('');
    const [isCreatingChat, setIsCreatingChat] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            fetchMyFriends();
            setError(null);
        } else {
            // Reset state on close
            setSelectedFriendIds([]);
            setStep(1);
            setGroupName('');
            setError(null);
        }
    }, [isOpen, fetchMyFriends]);

    const handleToggleFriend = (friendId: string) => {
        setSelectedFriendIds(prev =>
            prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
        );
    };

    const handleNext = () => {
        if (selectedFriendIds.length > 1) {
            setStep(2);
        } else {
            handleCreateChat(); // For 1-on-1 chat
        }
    };
    
    const handleCreateChat = async () => {
        if (!currentUser || selectedFriendIds.length === 0) return;
        setIsCreatingChat(true);
        setError(null);
        try {
            const newChat = await api.createChat(selectedFriendIds, currentUser.id, groupName.trim() || undefined);
            setActiveChatId(newChat.id); // Set the new chat as active
            onOpenChange(false); // Close dialog
        } catch (e) {
            console.error("Failed to create chat", e);
            setError(e instanceof Error ? e.message : "Failed to create chat. Please try again.");
        } finally {
            setIsCreatingChat(false);
        }
    };

    const isGroupChatCreation = selectedFriendIds.length > 1;
    const canProceed = selectedFriendIds.length > 0 && !isCreatingChat;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent aria-labelledby="create-chat-dialog-title">
                <DialogHeader>
                    <DialogTitle id="create-chat-dialog-title">{step === 1 ? 'Start a New Chat' : 'Name Your Group'}</DialogTitle>
                </DialogHeader>
                {step === 1 ? (
                    <ScrollArea className="max-h-80 min-h-[150px] space-y-2 py-2" aria-label="Select friends for new chat">
                        {friendsLoading ? (
                            <div className="flex justify-center py-4"><Spinner /></div>
                        ) : myFriends.length === 0 ? (
                            <p className="text-sm text-center text-text-secondary p-4">You have no friends yet. Add some to start chatting!</p>
                        ) : (
                            myFriends.map(friend => (
                                <div key={friend.id} onClick={() => handleToggleFriend(friend.id)}
                                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer 
                                                ${selectedFriendIds.includes(friend.id) ? 'bg-primary-accent/20' : 'hover:bg-background-secondary'}`}
                                    role="checkbox"
                                    aria-checked={selectedFriendIds.includes(friend.id)}
                                    tabIndex={0}
                                >
                                    <Avatar><AvatarImage src={friend.avatar} alt={`Avatar of ${friend.name}`} /><AvatarFallback>{friend.name[0]}</AvatarFallback></Avatar>
                                    <span className="font-medium text-text-primary">{friend.name}</span>
                                    {selectedFriendIds.includes(friend.id) && <Plus className="ml-auto h-4 w-4 rotate-45 text-primary-accent" />}
                                </div>
                            ))
                        )}
                    </ScrollArea>
                ) : (
                    <div className="space-y-2">
                        <Input 
                            placeholder="Enter group name (optional)" 
                            value={groupName} 
                            onChange={(e) => setGroupName(e.target.value)} 
                            disabled={isCreatingChat}
                            aria-label="Group name input"
                        />
                        <p className="text-sm text-text-secondary">Selected: {selectedFriendIds.length} friend(s)</p>
                    </div>
                )}
                {error && <p className="text-sm text-status-error text-center" role="alert">{error}</p>}
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost" disabled={isCreatingChat}>Cancel</Button></DialogClose>
                    <Button onClick={step === 1 ? handleNext : handleCreateChat} disabled={!canProceed || (step === 2 && isGroupChatCreation && !groupName.trim())}>
                        {isCreatingChat ? <Spinner size="sm"/> : (step === 1 && isGroupChatCreation ? 'Next' : 'Create Chat')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
