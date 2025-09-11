import { create } from 'zustand';
import type { User, FriendRequest } from '../types';
import * as api from '../lib/api';
import { useAuthStore } from './authStore';

interface FriendState {
  myFriends: User[];
  pendingRequests: (FriendRequest & { fromUser: User })[];
  searchResults: User[];
  isLoading: boolean;
  error: string | null;

  fetchMyFriends: () => Promise<void>;
  fetchPendingRequests: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  sendRequest: (toUserId: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  clearError: () => void;
}

const getCurrentUserId = () => useAuthStore.getState().currentUser?.id;

export const useFriendStore = create<FriendState>((set, get) => ({
  myFriends: [],
  pendingRequests: [],
  searchResults: [],
  isLoading: false,
  error: null,

  fetchMyFriends: async () => {
    const userId = getCurrentUserId();
    if (!userId) {
        set({ myFriends: [], isLoading: false }); // Clear friends if no user
        return;
    }
    set({ isLoading: true, error: null });
    try {
        const friends = await api.getFriends(userId);
        set({ myFriends: friends, isLoading: false });
    } catch (e) {
        set({ isLoading: false, error: "Failed to load friends." });
        console.error("Error fetching friends:", e);
    }
  },

  fetchPendingRequests: async () => {
    const userId = getCurrentUserId();
    if (!userId) {
        set({ pendingRequests: [], isLoading: false }); // Clear requests if no user
        return;
    }
    set({ isLoading: true, error: null });
    try {
        const requests = await api.getFriendRequests(userId);
        const requestsWithUsers = await Promise.all(
            requests.map(async req => ({
                ...req,
                fromUser: await api.getUserById(req.fromUserId) as User, // Assume user exists
            }))
        );
        set({ pendingRequests: requestsWithUsers.filter(r => r.fromUser), isLoading: false });
    } catch (e) {
        set({ isLoading: false, error: "Failed to load friend requests." });
        console.error("Error fetching requests:", e);
    }
  },
  
  searchUsers: async (query: string) => {
    const userId = getCurrentUserId();
    if (!userId) {
        set({ searchResults: [], isLoading: false }); // Clear search if no user
        return;
    }
    set({ isLoading: true, error: null });
    try {
        const results = await api.searchUsers(query, userId);
        set({ searchResults: results, isLoading: false });
    } catch (e) {
        set({ isLoading: false, error: "Failed to search users." });
        console.error("Error searching users:", e);
    }
  },

  sendRequest: async (toUserId: string) => {
    const fromUserId = getCurrentUserId();
    if (!fromUserId) return;
    set({ isLoading: true, error: null });
    try {
        await api.sendFriendRequest(fromUserId, toUserId);
        set({ isLoading: false });
        // Optionally refetch search results or update a local 'request sent' status
    } catch (e) {
        set({ isLoading: false, error: (e as Error).message });
        console.error("Error sending request:", e);
        throw e; // Re-throw to allow component to catch and display specific message
    }
  },
  
  acceptRequest: async (requestId: string) => {
      set({ isLoading: true, error: null });
      try {
          await api.updateFriendRequestStatus(requestId, 'accepted');
          await get().fetchPendingRequests(); // Refresh lists
          await get().fetchMyFriends();
          set({ isLoading: false });
      } catch (e) {
          set({ isLoading: false, error: (e as Error).message });
          console.error("Error accepting request:", e);
          throw e;
      }
  },

  rejectRequest: async (requestId: string) => {
      set({ isLoading: true, error: null });
      try {
          await api.updateFriendRequestStatus(requestId, 'rejected');
          await get().fetchPendingRequests(); // Refresh list
          set({ isLoading: false });
      } catch (e) {
          set({ isLoading: false, error: (e as Error).message });
          console.error("Error rejecting request:", e);
          throw e;
      }
  },

  removeFriend: async (friendId: string) => {
      const userId = getCurrentUserId();
      if (!userId) return;
      set({ isLoading: true, error: null });
      try {
          await api.removeFriend(userId, friendId);
          await get().fetchMyFriends(); // Refresh list
          set({ isLoading: false });
      } catch (e) {
          set({ isLoading: false, error: (e as Error).message });
          console.error("Error removing friend:", e);
          throw e;
      }
  },

  clearError: () => {
    set({ error: null });
  },
}));
