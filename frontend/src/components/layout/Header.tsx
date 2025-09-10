import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { API_BASE_URL } from '../../api/client';
import { useConnectionStore } from '../../store/useConnectionStore';
import { Wifi, WifiOff } from 'lucide-react';

export const Header = () => {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    // const { status, transport } = useConnectionStore();
    const { status } = useConnectionStore();

    const getStatusIndicator = () => {
        if (status === 'connected') {
            // return <Wifi className="h-5 w-5 text-status-success" title={`Connected via ${transport}`} />;
            return <Wifi className="h-5 w-5 text-status-success" />;
        }
        // return <WifiOff className="h-5 w-5 text-status-error" title="Disconnected" />;
        return <WifiOff className="h-5 w-5 text-status-error" />;
    };

    return (
        <header className="flex items-center justify-between p-4 bg-background-secondary border-b border-border">
            <div className="text-xl font-bold font-heading">Chatterbox</div>
            <div className="flex items-center gap-4">
                {getStatusIndicator()}
                <span className="text-text-primary hidden sm:inline">{user?.email}</span>
                <Avatar src={user?.profilePictureUrl ? `${API_BASE_URL}${user.profilePictureUrl}` : undefined} alt={user?.email} />
                <Button onClick={logout} variant='secondary'>Logout</Button>
            </div>
        </header>
    );
};
