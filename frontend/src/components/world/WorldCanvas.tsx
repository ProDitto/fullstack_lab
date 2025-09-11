import * as React from 'react';
import type { Player } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useWorldStore } from '@/store/worldStore';

interface WorldCanvasProps {
    players: Player[];
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({ players }) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const { currentUser } = useAuthStore();
    const { updatePlayerPosition } = useWorldStore();
    
    // Movement state
    const keysPressed = React.useRef<{ [key: string]: boolean }>({});

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        let animationFrameId: number;

        const render = () => {
            // Resize canvas to fit window
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update current player position
            if (currentUser) {
                const me = players.find(p => p.id === currentUser.id);
                if (me) {
                    let { x, y } = me.position;
                    const speed = 3;
                    if (keysPressed.current['w'] || keysPressed.current['arrowup']) y -= speed;
                    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) y += speed;
                    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) x -= speed;
                    if (keysPressed.current['d'] || keysPressed.current['arrowright']) x += speed;
                    
                    if (x !== me.position.x || y !== me.position.y) {
                        updatePlayerPosition(currentUser.id, { x, y });
                    }
                }
            }
            
            // Draw all players
            players.forEach(player => {
                // Draw circle
                ctx.beginPath();
                ctx.arc(player.position.x, player.position.y, 15, 0, 2 * Math.PI);
                ctx.fillStyle = player.id === currentUser?.id ? 'blue' : 'red';
                ctx.fill();
                ctx.closePath();

                // Draw name
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.font = '12px Open Sans';
                ctx.fillText(player.name, player.position.x, player.position.y - 20);
            });

            animationFrameId = window.requestAnimationFrame(render);
        };
        render();

        return () => {
            window.cancelAnimationFrame(animationFrameId);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [players, currentUser, updatePlayerPosition]);

    return <canvas ref={canvasRef} className="w-full h-full" />;
};