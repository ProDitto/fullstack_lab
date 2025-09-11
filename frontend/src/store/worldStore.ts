import { create } from 'zustand';
import type { OpenWorld, Player, Message } from '../types';
import * as api from '../lib/api';
import { useAuthStore } from './authStore';

interface WorldState {
  openWorlds: OpenWorld[];
  currentWorld: OpenWorld | null;
  playersInWorld: Player[];
  worldChatMessages: Message[]; // Messages specific to the current world
  isLoadingWorlds: boolean;
  isJoiningWorld: boolean;
  error: string | null;

  fetchOpenWorlds: () => Promise<void>;
  joinWorld: (worldId: string, password?: string) => Promise<boolean>;
  leaveWorld: () => void;
  updatePlayerPosition: (playerId: string, position: { x: number, y: number }) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  sendWorldMessage: (content: string) => Promise<void>;
  addWorldMessage: (message: Message) => void;
  clearError: () => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
    openWorlds: [],
    currentWorld: null,
    playersInWorld: [],
    worldChatMessages: [],
    isLoadingWorlds: false,
    isJoiningWorld: false,
    error: null,

    fetchOpenWorlds: async () => {
        set({ isLoadingWorlds: true, error: null });
        try {
            const worlds = await api.getOpenWorlds();
            set({ openWorlds: worlds, isLoadingWorlds: false });
        } catch (error) {
            console.error("Failed to fetch worlds:", error);
            set({ isLoadingWorlds: false, error: "Could not load worlds." });
        }
    },

    joinWorld: async (worldId, password) => {
        set({ isJoiningWorld: true, error: null });
        try {
            const world = await api.joinWorld(worldId, password);
            const currentUser = useAuthStore.getState().currentUser;
            if (!currentUser) throw new Error("User not authenticated");

            const currentPlayer: Player = {
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar,
                position: { x: 400, y: 300 } // Start in center
            };

            set({ currentWorld: world, isJoiningWorld: false, playersInWorld: [currentPlayer], worldChatMessages: [] }); // Clear old world messages
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to join world.";
            console.error(errorMessage);
            set({ isJoiningWorld: false, error: errorMessage });
            return false;
        }
    },

    leaveWorld: () => {
        set({ currentWorld: null, playersInWorld: [], worldChatMessages: [] });
    },
    
    updatePlayerPosition: (playerId, position) => {
        set(state => ({
            playersInWorld: state.playersInWorld.map(p => p.id === playerId ? { ...p, position } : p)
        }));
    },

    addPlayer: (player) => {
        set(state => ({ playersInWorld: [...state.playersInWorld, player] }));
    },

    removePlayer: (playerId) => {
        set(state => ({ playersInWorld: state.playersInWorld.filter(p => p.id !== playerId) }));
    },

    sendWorldMessage: async (content: string) => {
        const { currentWorld } = get();
        const currentUser = useAuthStore.getState().currentUser;
        if (!currentWorld || !currentUser || !content.trim()) return;

        try {
            // We rely on the Dexie hook in App.tsx for adding to worldChatMessages
            await api.sendWorldMessage(currentWorld.id, currentUser.id, content);
        } catch (error) {
            console.error("Failed to send world message:", error);
            set({ error: "Failed to send message." });
        }
    },

    addWorldMessage: (message: Message) => {
        set(state => ({
            worldChatMessages: [...state.worldChatMessages, message].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime())
        }));
    },

    clearError: () => {
        set({ error: null });
    },
}));
