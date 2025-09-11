import * as React from 'react';
import { useWorldStore } from '@/store/worldStore';
import { WorldCard } from '@/components/world/WorldCard';
import { Skeleton } from '@/components/ui/Skeleton';
import type { OpenWorld } from '@/types';
import { JoinWorldDialog } from '@/components/world/JoinWorldDialog';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';

const OpenWorldPage: React.FC = () => {
    const { openWorlds, isLoadingWorlds, fetchOpenWorlds, joinWorld, error, clearError } = useWorldStore();
    const [selectedWorldForJoin, setSelectedWorldForJoin] = React.useState<OpenWorld | null>(null);
    const navigate = useNavigate();

    React.useEffect(() => {
        fetchOpenWorlds();
    }, [fetchOpenWorlds]);

    // Clear any world-related errors when leaving the page
    React.useEffect(() => {
        return () => {
            clearError();
        };
    }, [clearError]);


    const handleJoinClick = async (world: OpenWorld) => {
        if (world.isPasswordProtected) {
            setSelectedWorldForJoin(world);
        } else {
            const success = await joinWorld(world.id);
            if (success) {
                navigate(`/open-world/${world.id}`);
            } else {
                alert(error || "Failed to join world."); // Provide basic feedback
            }
        }
    };

    return (
        <div className="p-4 sm:p-8 bg-background-secondary min-h-screen">
            <h1 className="text-3xl sm:text-4xl font-heading mb-6 text-text-primary">Open Worlds</h1>
            {isLoadingWorlds ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" role="progressbar" aria-label="Loading open worlds">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
                </div>
            ) : (
                <>
                    {openWorlds.length === 0 ? (
                        <div className="text-center text-text-secondary py-8" role="status">
                            <p>No open worlds available at the moment. Check back later!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {openWorlds.map(world => (
                                <WorldCard key={world.id} world={world} onJoin={handleJoinClick} />
                            ))}
                        </div>
                    )}
                </>
            )}
            {/* Dialog for password-protected worlds */}
            <JoinWorldDialog 
                world={selectedWorldForJoin} 
                onOpenChange={(isOpen) => !isOpen && setSelectedWorldForJoin(null)} // Close dialog
            />
        </div>
    );
};

export default OpenWorldPage;
