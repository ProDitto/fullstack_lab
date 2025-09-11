import { create } from 'zustand';
import type { Chat, Message } from '../types';
import * as api from '../lib/api';
import { useAuthStore } from './authStore';

interface ChatState {
  activeChatId: string | null;
  messages: Message[];
  messagesLoading: boolean;
  hasMoreMessages: boolean;
  
  setActiveChatId: (chatId: string | null) => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  addIncomingMessage: (message: Message) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChatId: null,
  messages: [],
  messagesLoading: false,
  hasMoreMessages: true,

  /**
   * Sets the active chat, clears previous messages, and fetches new ones.
   * Also marks messages in the newly active chat as seen.
   */
  setActiveChatId: async (chatId: string | null) => {
    const currentActiveId = get().activeChatId;
    if (currentActiveId === chatId) return;
    
    set({ activeChatId: chatId, messages: [], hasMoreMessages: true });
    
    if (chatId) {
      await get().fetchMessages(chatId);
      const currentUserId = useAuthStore.getState().currentUser?.id;
      if (currentUserId) {
        await api.markMessagesAsSeen(chatId, currentUserId);
      }
    }
  },

  /**
   * Fetches the initial batch of messages for a chat.
   */
  fetchMessages: async (chatId: string) => {
    set({ messagesLoading: true });
    try {
      const { messages, nextCursor } = await api.getMessagesForChat(chatId);
      set({
        messages,
        hasMoreMessages: !!nextCursor,
        messagesLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      set({ messagesLoading: false });
    }
  },

  /**
   * Loads an older batch of messages for the active chat for pagination.
   */
  loadMoreMessages: async () => {
    const { activeChatId, messages, hasMoreMessages } = get();
    if (!activeChatId || !hasMoreMessages) return;
    if (messages.length === 0) return; // Prevent loading more if no messages are present yet

    set({ messagesLoading: true });
    try {
      const oldestMessage = messages[0];
      const cursor = oldestMessage?.timestamp.getTime();
      const { messages: newMessages, nextCursor } = await api.getMessagesForChat(activeChatId, 50, cursor);
      
      set(state => ({
        messages: [...newMessages, ...state.messages],
        hasMoreMessages: !!nextCursor,
        messagesLoading: false,
      }));
    } catch (error)      {
      console.error("Failed to load more messages:", error);
      set({ messagesLoading: false });
    }
  },

  /**
   * Sends a message from the current user to the active chat.
   */
  sendMessage: async (content: string) => {
    const { activeChatId } = get();
    const senderId = useAuthStore.getState().currentUser?.id;

    if (!activeChatId || !senderId || !content.trim()) return;

    try {
      const newMessage = await api.sendMessage(activeChatId, senderId, content);
      set(state => ({ messages: [...state.messages, newMessage] }));
    } catch (error) {
      console.error("Failed to send message:", error);
      // Here you might want to add UI feedback for a failed message
    }
  },

  /**
   * Adds a new incoming message to the message list if it belongs to the active chat.
   * This is intended to be called by a listener (e.g., from our simulation hook or Dexie hook).
   * @param message - The new message object.
   */
  addIncomingMessage: (message: Message) => {
    const { activeChatId } = get();
    if (message.chatId === activeChatId) {
        set(state => ({
            messages: [...state.messages, message],
        }));
    }
  },
}));
