import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '../ui/Button';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Chat, User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import { Input } from '../ui/Input';
import { Save, Plus, Trash2, Crown, X } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import { ScrollArea } from '../ui/ScrollArea';

interface GroupSettingsDialogProps {
    chatId: string;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export const GroupSettingsDialog: React.FC<GroupSettingsDialogProps> = ({ chatId, isOpen, onOpenChange }) => {
    const { currentUser } = useAuth();
    const { setActiveChatId } = useChatStore();
    const groupChat = useLiveQuery(() => db.chats.get(chatId), [chatId]) as Chat | undefined;
    
    const [groupName, setGroupName] = React.useState(groupChat?.name || '');
    const [isEditingName, setIsEditingName] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isLeaving, setIsLeaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Fetch participants
    const participants = useLiveQuery(
        async () => {
            if (!groupChat?.participantIds.length) return [];
            return await db.users.bulkGet(groupChat.participantIds);
        },
        [groupChat?.participantIds]
    ) as User[] | undefined;

    React.useEffect(() => {
        if (groupChat?.name) {
            setGroupName(groupChat.name);
        }
    }, [groupChat?.name]);

    const isCreator = currentUser?.id === groupChat?.creatorId;

    const handleUpdateGroupName = async () => {
        if (!groupName.trim() || !groupChat || !currentUser || !isCreator) return;
        setIsSaving(true);
        setError(null);
        try {
            await api.updateGroupChat(groupChat.id, { name: groupName.trim() });
            setIsEditingName(false);
            alert("Group name updated!");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update group name.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!currentUser || !groupChat) return;
        if (!window.confirm(`Are you sure you want to leave "${groupChat.name || 'this group'}"?`)) return;

        setIsLeaving(true);
        setError(null);
        try {
            await api.leaveGroup(groupChat.id, currentUser.id);
            setActiveChatId(null); // Clear active chat if current user leaves
            onOpenChange(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to leave group.");
        } finally {
            setIsLeaving(false);
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!currentUser || !groupChat) return;
        if (!window.confirm(`Are you sure you want to remove ${memberName} from the group?`)) return;

        try {
            await api.removeGroupMember(groupChat.id, memberId);
        } catch (e) {
            setError(e instanceof Error ? e.message : `Failed to remove ${memberName}.`);
        }
    };

    const handleAddMember = () => {
        // This would ideally open a separate "Add Members" dialog
        alert("Adding members feature not implemented in detail yet. This would open a dialog to select friends to add.");
    };

    if (!groupChat) {
        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                 <DialogContent><div className="flex justify-center py-4"><Spinner /></div></DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent aria-labelledby="group-settings-dialog-title">
                <DialogHeader>
                    <DialogTitle id="group-settings-dialog-title">{groupChat.name || 'Group Settings'}</DialogTitle>
                    <DialogDescription>Manage members and group details.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Group Name */}
                    <div className="flex items-center gap-2">
                        {isEditingName && isCreator ? (
                            <>
                                <Input 
                                    value={groupName} 
                                    onChange={e => setGroupName(e.target.value)} 
                                    disabled={isSaving}
                                    aria-label="Edit group name"
                                />
                                <Button size="icon" onClick={handleUpdateGroupName} disabled={isSaving}>
                                    {isSaving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => { setIsEditingName(false); setGroupName(groupChat.name || ''); }} disabled={isSaving}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </>
                        ) : (
                            <h3 className="text-lg font-semibold flex-1">{groupChat.name || 'Group Chat'}</h3>
                        )}
                        {isCreator && !isEditingName && (
                            <Button variant="ghost" size="sm" onClick={() => setIsEditingName(true)} aria-label="Edit group name">Edit</Button>
                        )}
                    </div>

                    {/* Members List */}
                    <div>
                        <h4 className="font-semibold mb-2">Members ({participants?.length || 0})</h4>
                        <ScrollArea className="h-40 border rounded-md">
                            <div className="p-2 space-y-2">
                                {participants?.map(member => member && (
                                    <div key={member.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8"><AvatarImage src={member.avatar} /><AvatarFallback>{member.name[0]}</AvatarFallback></Avatar>
                                            <span className="text-sm">{member.name}</span>
                                            {/* {member.id === groupChat.creatorId && <Crown className="h-4 w-4 text-yellow-500" title="Group Creator" />} */}
                                            {member.id === groupChat.creatorId && <Crown className="h-4 w-4 text-yellow-500" />}
                                        </div>
                                        {isCreator && member.id !== currentUser?.id && ( // Creator can remove anyone but themselves
                                            <Button 
                                                variant="destructive" 
                                                size="sm" 
                                                onClick={() => handleRemoveMember(member.id, member.name)}
                                                aria-label={`Remove ${member.name} from group`}
                                            >
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        {!isCreator && ( // Only non-creators can add members through this dialog
                            <Button variant="outline" className="mt-2 w-full" onClick={handleAddMember} aria-label="Add members to group">
                                <Plus className="h-4 w-4 mr-2" />Add Members
                            </Button>
                        )}
                    </div>
                </div>
                {error && <p className="text-sm text-status-error text-center mt-4" role="alert">{error}</p>}
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving || isLeaving}>Close</Button>
                    {!isCreator && ( // Only show leave button if not creator or if creator is last member
                         <Button variant="destructive" onClick={handleLeaveGroup} disabled={isLeaving} aria-label="Leave group">
                            {isLeaving ? <Spinner size="sm" /> : 'Leave Group'}
                         </Button>
                    )}
                    {isCreator && groupChat.participantIds.length === 1 && groupChat.participantIds[0] === currentUser?.id && (
                         <Button variant="destructive" onClick={handleLeaveGroup} disabled={isLeaving} aria-label="Delete group">
                            {isLeaving ? <Spinner size="sm" /> : 'Delete Group'}
                         </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
