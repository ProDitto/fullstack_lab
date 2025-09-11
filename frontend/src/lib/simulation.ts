import { db } from './db';
import type { Message, User, Chat, Player } from '../types';
import { v4 as uuidv4 } from 'uuid';

let chatSimulationInterval: NodeJS.Timeout | null = null;
let worldSimulationInterval: NodeJS.Timeout | null = null;

const MOCK_MESSAGES = [
    "Hey, do you have a minute to chat?",
    "Just saw your message, I'll get back to you shortly.",
    "That sounds great! Let's do it.",
    "Can you send me the file?",
    "I'm running a bit late, sorry!",
    "Let's sync up tomorrow morning.",
    "👍",
    "😂",
    "Got it, thanks!",
];

const WORLD_MOCK_MESSAGES = [
    "Hello everyone!", "Nice place.", "Anyone seen the hidden waterfall?", "Lagging a bit.", "This is cool!",
    "Just exploring around here.", "What's up, world?", "Any events happening soon?", "Wish I had more gold."
];

/**
 * Starts the real-time chat simulation.
 * This function sets up an interval to perform two main actions:
 * 1. Simulate a mock user sending a new message to a chat the current user is in.
 * 2. Simulate message status updates (delivered, seen) for messages sent by the current user.
 * 
 * @param currentUserId - The ID of the currently logged-in user.
 */
export const startChatSimulation = (currentUserId: string) => {
    if (chatSimulationInterval) {
        console.log("Chat simulation already running.");
        return;
    }

    console.log("Starting chat simulation...");

    chatSimulationInterval = setInterval(async () => {
        try {
            // Action 1: Simulate a new incoming message from a mock user
            if (Math.random() < 0.3) { // 30% chance to send a message each interval
                const userChats = await db.chats.where('participantIds').equals(currentUserId).filter(chat => !chat.isGroup || chat.name !== 'World Chat').toArray(); // Exclude world chats
                if (userChats.length === 0) return;

                // Pick a random chat
                const randomChat = userChats[Math.floor(Math.random() * userChats.length)];
                
                // Pick a random participant from that chat (who is not the current user)
                const otherParticipants = randomChat.participantIds.filter(id => id !== currentUserId);
                if (otherParticipants.length === 0) return; // No other participants to send from
                
                const randomSenderId = otherParticipants[Math.floor(Math.random() * otherParticipants.length)];

                // Ensure the sender is actually a user and not 'system'
                const senderUser = await db.users.get(randomSenderId);
                if (!senderUser) return;

                const newMessage: Message = {
                    id: uuidv4(),
                    chatId: randomChat.id,
                    senderId: randomSenderId,
                    content: MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)],
                    timestamp: new Date(),
                    isEvent: false,
                };

                await db.transaction('rw', db.messages, db.chats, async () => {
                    await db.messages.add(newMessage);
                    // Increment unread count for the chat
                    await db.chats.update(randomChat.id, { 
                        lastMessage: newMessage,
                        unreadCount: (randomChat.unreadCount || 0) + 1,
                    });
                });
            }

            // Action 2: Simulate status updates for messages sent by the current user
            const sentMessages = await db.messages
                .where({ senderId: currentUserId })
                .and(msg => msg.status === 'sent' || msg.status === 'delivered')
                .toArray();

            for (const msg of sentMessages) {
                if (msg.status === 'sent' && Math.random() < 0.5) { // 50% chance to become 'delivered'
                    await db.messages.update(msg.id, { status: 'delivered' });
                    // Also update the lastMessage in the chat if it matches
                    const chat = await db.chats.get(msg.chatId);
                    if (chat?.lastMessage?.id === msg.id) {
                        await db.chats.update(msg.chatId, { 'lastMessage.status': 'delivered' });
                    }
                } else if (msg.status === 'delivered' && Math.random() < 0.2) { // 20% chance to become 'seen'
                    await db.messages.update(msg.id, { status: 'seen' });
                    const chat = await db.chats.get(msg.chatId);
                    if (chat?.lastMessage?.id === msg.id) {
                         await db.chats.update(msg.chatId, { 'lastMessage.status': 'seen' });
                    }
                }
            }

        } catch (error) {
            console.error("Error in chat simulation interval:", error);
        }
    }, 5000); // Run every 5 seconds
};

/**
 * Stops the real-time chat simulation by clearing the interval.
 */
export const stopChatSimulation = () => {
    if (chatSimulationInterval) {
        clearInterval(chatSimulationInterval);
        chatSimulationInterval = null;
        console.log("Chat simulation stopped.");
    }
};


const worldPlayers: Map<string, { position: { x: number, y: number }, velocity: { x: number, y: number } }> = new Map();

/**
 * Starts the world simulation for mock players and in-world chat.
 * @param worldId - The ID of the world to simulate.
 * @param addPlayer - Callback to add a new player to the world state.
 * @param updatePlayerPosition - Callback to update an existing player's position.
 * @param addWorldMessage - Callback to add a new world chat message.
 * @param canvasWidth - The width of the canvas for bounds checking.
 * @param canvasHeight - The height of the canvas for bounds checking.
 */
export const startWorldSimulation = (
    worldId: string,
    addPlayer: (player: Player) => void,
    updatePlayerPosition: (playerId: string, position: { x: number, y: number }) => void,
    addWorldMessage: (message: Message) => void,
    canvasWidth: number,
    canvasHeight: number,
) => {
    if (worldSimulationInterval) {
        console.log("World simulation already running.");
        return;
    }

    console.log(`Starting world simulation for ${worldId}...`);

    // Initial population of mock players
    db.users.filter(user => user.id !== localStorage.getItem('userId')).limit(5).toArray().then(mockUsers => {
        mockUsers.forEach(user => {
            if (!worldPlayers.has(user.id)) {
                const player: Player = {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar,
                    position: { x: Math.random() * canvasWidth, y: Math.random() * canvasHeight }
                };
                worldPlayers.set(user.id, { position: player.position, velocity: { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 } });
                addPlayer(player); // Add to Zustand store
            }
        });
    });

    worldSimulationInterval = setInterval(async () => {
        // Update player positions
        worldPlayers.forEach((player, playerId) => {
            let { x, y } = player.position;
            let { x: vx, y: vy } = player.velocity;

            x += vx;
            y += vy;

            // Bounce off walls
            if (x < 0) { x = 0; vx = -vx; }
            if (x > canvasWidth) { x = canvasWidth; vx = -vx; }
            if (y < 0) { y = 0; vy = -vy; }
            if (y > canvasHeight) { y = canvasHeight; vy = -vy; }
            
            player.position = { x, y };
            player.velocity = { x: vx, y: vy };
            
            updatePlayerPosition(playerId, { x, y }); // Update Zustand store
        });

        // Simulate a new incoming world message
        if (Math.random() < 0.05) { // 5% chance every 2 seconds
            const mockUsers = await db.users.filter(user => user.id !== localStorage.getItem('userId')).limit(5).toArray();
            if (mockUsers.length === 0) return;
            const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
            
            const newMessage: Message = {
                id: uuidv4(),
                chatId: worldId,
                senderId: randomUser.id,
                content: WORLD_MOCK_MESSAGES[Math.floor(Math.random() * WORLD_MOCK_MESSAGES.length)],
                timestamp: new Date(),
                isEvent: false,
            };

            // Directly add to DB, and the RealtimeMessageSync will pick it up
            await db.messages.add(newMessage);
        }

    }, 1000 / 30); // Run at 30 FPS
};

/**
 * Stops the world simulation.
 */
export const stopWorldSimulation = () => {
    if (worldSimulationInterval) {
        clearInterval(worldSimulationInterval);
        worldSimulationInterval = null;
        worldPlayers.clear(); // Clear all mock players
        console.log("World simulation stopped.");
    }
};
