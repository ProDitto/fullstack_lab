import { create } from 'zustand';
import type { Message } from '../types';
import { db } from '../lib/db';

interface ChatState {
  messagesByChatId: Record<string, Message[]>;
  addMessage: (chatId: string, message: Message, isOptimistic: boolean) => void;
  loadMessagesFromDB: (chatId: string) => Promise<void>;
  updateMessageStatus: (tempId: string, newId: string, status: Message['status'], createdAt: string) => void;
  clearChatHistory: (chatId: string, retainCount?: number) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByChatId: {},

  addMessage: async (chatId, message, isOptimistic) => {
    if (isOptimistic) {
      await db.messages.add(message, message.tempId);
    } else {
      await db.messages.put(message);
    }

    // Auto-trimming logic
    const count = await db.messages.where('chatId').equals(chatId).count();
    if (count > 2000) { // Threshold for trimming
      get().clearChatHistory(chatId, 100);
    } else {
      set((state) => ({
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: [...(state.messagesByChatId[chatId] || []), message].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        },
      }));
    }
  },

  loadMessagesFromDB: async (chatId) => {
    const messages = await db.messages.where('chatId').equals(chatId).sortBy('createdAt');
    set((state) => ({
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: messages,
      },
    }));
  },

  updateMessageStatus: async (tempId, newId, status, createdAt) => {
    await db.messages.where({ tempId }).modify({ id: newId, status, createdAt });

    set(state => {
      const chatMessages = state.messagesByChatId;
      for (const chatId in chatMessages) {
        const messages = chatMessages[chatId];
        const msgIndex = messages.findIndex(m => m.tempId === tempId);
        if (msgIndex !== -1) {
          const newMessages = [...messages];
          newMessages[msgIndex] = { ...newMessages[msgIndex], id: newId, status, createdAt };
          return { messagesByChatId: { ...chatMessages, [chatId]: newMessages } };
        }
      }
      return state;
    })
  },

  clearChatHistory: async (chatId, retainCount = 100) => {
    const keysToDelete = await db.messages.where('chatId').equals(chatId).reverse().offset(retainCount).primaryKeys();
    await db.messages.bulkDelete(keysToDelete);
    get().loadMessagesFromDB(chatId); // Reload messages
  },

}));
