/**
 * Defines the core data structures and types used throughout the QuikChat application.
 * These types are designed to be consistent with the backend API specification.
 */

import type { Table } from 'dexie';

// Represents the status of a message sent by the current user.
export type MessageStatus = 'sent' | 'delivered' | 'seen';

// Represents a user in the system.
export interface User {
  id: string; // UUID
  email: string;
  name: string;
  avatar: string; // URL
  isOnline: boolean;
  createdAt: Date;
  // For local simulation, storing password hash
  passwordHash?: string;
  friends: string[]; // Array of user IDs
}

// Represents a single message within a chat.
export interface Message {
  id: string; // UUID
  chatId: string; // UUID of the chat it belongs to
  senderId: string; // UUID of the user who sent it
  content: string;
  timestamp: Date;
  isEvent: boolean; // True if it's a system event (e.g., "User joined")
  status?: MessageStatus; // Only for messages sent by the current user
}

// Represents a chat conversation, which can be a 1-on-1 or a group chat.
export interface Chat {
  id: string; // UUID
  name?: string; // Group chat name
  avatar?: string; // Group chat avatar URL
  isGroup: boolean;
  creatorId?: string; // User ID of the group creator
  participantIds: string[];
  lastMessage?: Message;
  unreadCount: number;
}

// Represents a friend request between two users.
export interface FriendRequest {
  id: string; // UUID
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

// Represents an open world that users can join.
export interface OpenWorld {
  id: string; // e.g., "nexus-prime"
  name: string;
  description: string;
  imageUrl: string;
  population: number;
  isPasswordProtected: boolean;
  password?: string; // For simulation purposes
}

// Represents a player within an Open World.
export interface Player {
  id: string; // User ID
  name: string;
  avatar: string;
  position: {
    x: number;
    y: number;
  };
}

// Represents a user-created theme configuration.
export interface ThemeConfig {
  id: string; // UUID
  name: string;
  colors: {
    background: {
      primary: string;
      secondary: string;
    };
    text: {
      primary: string;
      secondary: string;
    };
    border: string;
    primary: {
      accent: string;
    };
    secondary: {
      accent: string;
    };
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
  };
}

// Dexie table interfaces for type-safe database interactions.
export interface QuikChatTables {
  users: Table<User, string>;
  chats: Table<Chat, string>;
  messages: Table<Message, string>;
  friendRequests: Table<FriendRequest, string>;
  openWorlds: Table<OpenWorld, string>;
  themes: Table<ThemeConfig, string>;
}
