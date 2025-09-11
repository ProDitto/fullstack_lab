import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorldStore } from '@/store/worldStore';
import { WorldCanvas } from '@/components/world/WorldCanvas';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { startWorldSimulation, stopWorldSimulation } from '@/lib/simulation';
import { WorldChat } from '@/components/world/WorldChat';
import { useAuthStore } from '@/store/authStore';

const WorldInstancePage: React.FC = () => {
    const { worldId } = useParams<{ worldId: string }>();
    const navigate = useNavigate();
    const { 
        currentWorld, 
        playersInWorld, 
        leaveWorld, 
        addPlayer, 
        updatePlayerPosition, 
        removePlayer, 
        addWorldMessage, 
        error, 
        clearError 
    } = useWorldStore();
    const { isAuthenticated } = useAuthStore();

    // Dynamically get canvas dimensions for simulation bounds
    const [canvasDimensions, setCanvasDimensions] = React.useState({ width: 0, height: 0 });
    const canvasContainerRef = React.useRef<HTMLDivElement>(null);


    React.useEffect(() => {
        if (!worldId || !isAuthenticated) {
            navigate('/open-world'); // Redirect if no worldId or not authenticated
            return;
        }

        const handleResize = () => {
            if (canvasContainerRef.current) {
                setCanvasDimensions({
                    width: canvasContainerRef.current.clientWidth,
                    height: canvasContainerRef.current.clientHeight,
                });
            }
        };

        handleResize(); // Initial set
        window.addEventListener('resize', handleResize);

        // Start simulation when entering a world
        if (worldId && currentWorld?.id === worldId && canvasDimensions.width > 0 && canvasDimensions.height > 0) {
            startWorldSimulation(
                worldId,
                addPlayer,
                updatePlayerPosition,
                addWorldMessage,
                canvasDimensions.width,
                canvasDimensions.height
            );
        }
        
        return () => {
            stopWorldSimulation();
            leaveWorld();
            window.removeEventListener('resize', handleResize);
            clearError(); // Clear any world-specific errors on unmount
        };
    }, [
        worldId, 
        navigate, 
        isAuthenticated, 
        currentWorld, // Only re-run if currentWorld changes
        leaveWorld, 
        addPlayer, 
        updatePlayerPosition, 
        removePlayer, 
        addWorldMessage,
        canvasDimensions.width,
        canvasDimensions.height,
        clearError
    ]);

    if (!currentWorld || currentWorld.id !== worldId) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black" role="status" aria-label="Loading world">
                <Spinner size="lg" />
            </div>
        );
    }
    
    // Display error if any
    if (error) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background-primary text-status-error p-4">
                <p className="text-xl mb-4">Error: {error}</p>
                <Button onClick={() => navigate('/open-world')}>Back to Worlds</Button>
            </div>
        );
    }

    return (
        <div ref={canvasContainerRef} id="world-canvas-container" className="h-screen w-full bg-black relative overflow-hidden">
            <Button
                variant="ghost"
                className="absolute top-4 left-4 z-10 text-white bg-black/50 hover:bg-black/80 hover:text-white"
                onClick={() => navigate('/open-world')}
                aria-label="Back to Open Worlds selection"
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Worlds
            </Button>
            {/* WorldCanvas will take the dimensions of its parent container */}
            <WorldCanvas players={playersInWorld} />
            <WorldChat />
        </div>
    );
};

export default WorldInstancePage;
