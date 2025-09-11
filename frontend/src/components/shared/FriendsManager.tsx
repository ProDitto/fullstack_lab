import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import { useFriendStore } from '@/store/friendStore';
import { Check, UserPlus, X } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/store/authStore';

export const FriendsManager: React.FC = () => {
    const { fetchMyFriends, fetchPendingRequests } = useFriendStore();

    // Fetch initial data when component mounts
    React.useEffect(() => {
        fetchMyFriends();
        fetchPendingRequests();
    }, [fetchMyFriends, fetchPendingRequests]);

    return (
        <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="friends" aria-controls="my-friends-tab-content">My Friends</TabsTrigger>
                <TabsTrigger value="requests" aria-controls="requests-tab-content">Requests</TabsTrigger>
                <TabsTrigger value="find" aria-controls="find-tab-content">Find</TabsTrigger>
            </TabsList>
            <TabsContent value="friends" id="my-friends-tab-content"><MyFriendsTab /></TabsContent>
            <TabsContent value="requests" id="requests-tab-content"><RequestsTab /></TabsContent>
            <TabsContent value="find" id="find-tab-content"><FindTab /></TabsContent>
        </Tabs>
    );
};

const MyFriendsTab: React.FC = () => {
    const { myFriends, removeFriend, isLoading } = useFriendStore();

    const handleRemoveFriend = async (friendId: string, friendName: string) => {
        if (window.confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
            try {
                await removeFriend(friendId);
            } catch (error) {
                console.error("Failed to remove friend:", error);
                alert("Failed to remove friend."); // Basic error feedback
            }
        }
    };

    return (
        <div className="space-y-2 max-h-80 overflow-y-auto" role="region" aria-label="My Friends List">
            {isLoading && !myFriends.length && <div className="flex justify-center p-4"><Spinner /></div>}
            {!isLoading && myFriends.length === 0 && <p className="text-sm text-center text-text-secondary p-4">You have no friends yet. Find some!</p>}
            {myFriends.map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-2 rounded-md hover:bg-background-secondary" aria-label={`Friend: ${friend.name}`}>
                    <div className="flex items-center gap-3">
                        <Avatar><AvatarImage src={friend.avatar} alt={`Avatar of ${friend.name}`} /><AvatarFallback>{friend.name[0]}</AvatarFallback></Avatar>
                        <span className="font-medium text-text-primary">{friend.name}</span>
                    </div>
                    <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleRemoveFriend(friend.id, friend.name)}
                        disabled={isLoading}
                        aria-label={`Remove ${friend.name}`}
                    >
                        Remove
                    </Button>
                </div>
            ))}
        </div>
    );
};

const RequestsTab: React.FC = () => {
    const { pendingRequests, acceptRequest, rejectRequest, isLoading } = useFriendStore();

    const handleAcceptRequest = async (requestId: string, userName: string) => {
        try {
            await acceptRequest(requestId);
            alert(`Accepted friend request from ${userName}.`);
        } catch (error) {
            console.error("Failed to accept request:", error);
            alert("Failed to accept friend request.");
        }
    };

    const handleRejectRequest = async (requestId: string, userName: string) => {
        if (window.confirm(`Are you sure you want to reject the friend request from ${userName}?`)) {
            try {
                await rejectRequest(requestId);
                alert(`Rejected friend request from ${userName}.`);
            } catch (error) {
                console.error("Failed to reject request:", error);
                alert("Failed to reject friend request.");
            }
        }
    };

    return (
        <div className="space-y-2 max-h-80 overflow-y-auto" role="region" aria-label="Pending Friend Requests">
            {isLoading && !pendingRequests.length && <div className="flex justify-center p-4"><Spinner /></div>}
            {!isLoading && pendingRequests.length === 0 && <p className="text-sm text-center text-text-secondary p-4">No pending friend requests.</p>}
            {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-2 rounded-md hover:bg-background-secondary" aria-label={`Friend request from ${req.fromUser.name}`}>
                    <div className="flex items-center gap-3">
                        <Avatar><AvatarImage src={req.fromUser.avatar} alt={`Avatar of ${req.fromUser.name}`} /><AvatarFallback>{req.fromUser.name[0]}</AvatarFallback></Avatar>
                        <span className="font-medium text-text-primary">{req.fromUser.name}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            size="icon" 
                            className="bg-status-success hover:bg-status-success/90" 
                            onClick={() => handleAcceptRequest(req.id, req.fromUser.name)}
                            disabled={isLoading}
                            aria-label={`Accept request from ${req.fromUser.name}`}
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                            size="icon" 
                            variant="destructive" 
                            onClick={() => handleRejectRequest(req.id, req.fromUser.name)}
                            disabled={isLoading}
                            aria-label={`Reject request from ${req.fromUser.name}`}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
};

const FindTab: React.FC = () => {
    const [query, setQuery] = React.useState('');
    const debouncedQuery = useDebounce(query, 300);
    const { searchResults, searchUsers, sendRequest, isLoading, myFriends, pendingRequests } = useFriendStore();
    const { currentUser } = useAuthStore();

    React.useEffect(() => {
        if (debouncedQuery && currentUser) {
            searchUsers(debouncedQuery);
        } else if (!debouncedQuery) {
            useFriendStore.setState({ searchResults: [] }); // Clear results if query is empty
        }
    }, [debouncedQuery, searchUsers, currentUser]);

    const handleSendRequest = async (toUserId: string, userName: string) => {
        try {
            await sendRequest(toUserId);
            alert(`Friend request sent to ${userName}.`);
            searchUsers(query); // Refresh search results to update button state
        } catch (error) {
            console.error("Failed to send request:", error);
            alert(error instanceof Error ? error.message : "Failed to send friend request.");
        }
    };

    const isFriend = (userId: string) => myFriends.some(f => f.id === userId);
    const hasPendingRequest = (userId: string) => pendingRequests.some(req => req.fromUserId === userId || req.toUserId === userId);


    return (
        <div className="space-y-4" role="region" aria-label="Find New Friends">
            <Input 
                placeholder="Search by name or email..." 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
                disabled={isLoading}
                aria-label="Search for users"
            />
            <div className="space-y-2 max-h-72 overflow-y-auto">
                {isLoading && <div className="flex justify-center p-4"><Spinner/></div>}
                {!isLoading && !searchResults.length && query && <p className="text-sm text-center text-text-secondary p-4">No users found for "{query}".</p>}
                {!isLoading && searchResults.length === 0 && !query && <p className="text-sm text-center text-text-secondary p-4">Start typing to find new friends!</p>}
                {searchResults.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-md hover:bg-background-secondary" aria-label={`User: ${user.name}`}>
                        <div className="flex items-center gap-3">
                            <Avatar><AvatarImage src={user.avatar} alt={`Avatar of ${user.name}`} /><AvatarFallback>{user.name[0]}</AvatarFallback></Avatar>
                            <span className="font-medium text-text-primary">{user.name}</span>
                        </div>
                        {isFriend(user.id) ? (
                            <span className="text-sm text-text-secondary">Friends</span>
                        ) : hasPendingRequest(user.id) ? (
                            <span className="text-sm text-text-secondary">Request Sent/Pending</span>
                        ) : (
                            <Button 
                                size="sm" 
                                onClick={() => handleSendRequest(user.id, user.name)}
                                disabled={isLoading}
                                aria-label={`Send friend request to ${user.name}`}
                            >
                                <UserPlus className="h-4 w-4 mr-2" />Add
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
