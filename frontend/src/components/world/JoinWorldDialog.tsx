import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useWorldStore } from '@/store/worldStore';
import type { OpenWorld } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../ui/Spinner';

interface JoinWorldDialogProps {
    world: OpenWorld | null;
    onOpenChange: (isOpen: boolean) => void;
}

export const JoinWorldDialog: React.FC<JoinWorldDialogProps> = ({ world, onOpenChange }) => {
    const { joinWorld, isJoiningWorld, error, clearError } = useWorldStore();
    const [password, setPassword] = React.useState('');
    const navigate = useNavigate();

    const handleJoin = async () => {
        if (!world) return;
        clearError(); // Clear previous errors
        const success = await joinWorld(world.id, password);
        if (success) {
            onOpenChange(false);
            navigate(`/open-world/${world.id}`);
        }
    };

    // Clear state on dialog close or world change
    React.useEffect(() => {
        if (!world) {
            setPassword('');
            clearError();
        }
    }, [world, clearError]);


    return (
        <Dialog open={!!world} onOpenChange={onOpenChange}>
            <DialogContent aria-labelledby="join-world-dialog-title">
                <DialogHeader>
                    <DialogTitle id="join-world-dialog-title">Join "{world?.name}"</DialogTitle>
                    <DialogDescription>This world is password protected. Please enter the password to join.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Input
                        type="password"
                        placeholder="World Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isJoiningWorld}
                        aria-label="World password"
                        aria-invalid={!!error}
                        aria-describedby="password-error-message"
                    />
                    {error && <p id="password-error-message" className="text-sm text-status-error" role="alert">{error}</p>}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isJoiningWorld}>Cancel</Button>
                    <Button onClick={handleJoin} disabled={isJoiningWorld || !password.trim()} aria-label={`Join ${world?.name || 'world'}`}>
                        {isJoiningWorld ? <Spinner size="sm" /> : 'Join'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
