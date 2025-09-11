import * as React from 'react';
import { useAuthStore } from '../store/authStore';
import { useWorldStore } from '../store/worldStore';
import { startChatSimulation, stopChatSimulation, startWorldSimulation, stopWorldSimulation } from '../lib/simulation';

/**
 * A custom hook to manage the lifecycle of both chat and world simulations.
 * It starts simulations when a user is authenticated and in an active world (for world sim),
 * and stops them when conditions are no longer met. This mimics a WebSocket connection lifecycle.
 */
export const useWebSocketSim = () => {
    const { currentUser, isAuthenticated } = useAuthStore();
    const { currentWorld, addPlayer, updatePlayerPosition, removePlayer, addWorldMessage } = useWorldStore();

    // Chat Simulation Lifecycle
    React.useEffect(() => {
        if (isAuthenticated && currentUser) {
            startChatSimulation(currentUser.id);
        } else {
            stopChatSimulation();
        }

        return () => {
            stopChatSimulation();
        };
    }, [isAuthenticated, currentUser]);

    // World Simulation Lifecycle
    React.useEffect(() => {
        if (isAuthenticated && currentUser && currentWorld) {
            // Get current canvas dimensions for simulation bounds
            const canvasElement = document.getElementById('world-canvas');
            const canvasWidth = canvasElement?.clientWidth || window.innerWidth;
            const canvasHeight = canvasElement?.clientHeight || window.innerHeight;

            startWorldSimulation(
                currentWorld.id,
                addPlayer,
                updatePlayerPosition,
                addWorldMessage,
                canvasWidth,
                canvasHeight
            );
        } else {
            stopWorldSimulation();
        }

        return () => {
            stopWorldSimulation();
        };
    }, [isAuthenticated, currentUser, currentWorld, addPlayer, updatePlayerPosition, removePlayer, addWorldMessage]);
};
