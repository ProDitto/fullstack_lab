import { db } from './db';
import type { Chat, FriendRequest, Message, OpenWorld, ThemeConfig, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const register = async (name: string, email: string, password: string): Promise<User> => {
  await wait(1000); // Simulate network latency

  const existingUser = await db.users.where('email').equals(email).first();
  if (existingUser) {
    throw new Error('Email already in use.');
  }

  const newUser: User = {
    id: uuidv4(),
    name,
    email,
    passwordHash: password, // In a real app, this would be a securely generated hash.
    avatar: `https://i.pravatar.cc/150?u=${uuidv4()}`,
    isOnline: true,
    createdAt: new Date(),
    friends: [],
  };

  await db.users.add(newUser);
  return newUser;
};

/**
 * Simulates user login.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns The authenticated user object.
 * @throws An error if the credentials are invalid.
 */
export const login = async (email: string, password: string): Promise<User> => {
    await wait(1000); // Simulate network latency

  const user = await db.users.where('email').equals(email).first();

  if (!user || user.passwordHash !== password) {
    throw new Error('Invalid email or password.');
  }

  // Set user to online
  await db.users.update(user.id, { isOnline: true });
  return { ...user, isOnline: true };
};

/**
 * Simulates a quick login for pre-seeded mock users.
 * @param userId - The ID of the user to log in.
 * @returns The authenticated user object.
 * @throws An error if the user is not found.
 */
export const quickLogin = async (userId: string): Promise<User> => {
  await wait(500); // Faster login for quick login

  const user = await db.users.get(userId);
  if (!user) {
    throw new Error('User not found.');
  }
  
  // Set user to online
  await db.users.update(user.id, { isOnline: true });
  return { ...user, isOnline: true };
};

/**
 * Simulates user logout.
 * @param userId - The ID of the user logging out.
 */
export const logout = async (userId: string): Promise<void> => {
    await wait(500);
    // Set user to offline
    if (userId) {
        await db.users.update(userId, { isOnline: false });
    }
    return;
};


/**
 * Fetches a user profile by ID.
 * @param userId The ID of the user to fetch.
 * @returns The user object.
 */
export const getUserById = async (userId: string): Promise<User | undefined> => {
    await wait(300);
    return db.users.get(userId);
};

/**
 * Fetches messages for a specific chat with cursor-based pagination.
 * @param chatId - The ID of the chat.
 * @param limit - The number of messages to fetch.
 * @param cursor - The timestamp of the last message from the previous fetch (for pagination).
 * @returns An object containing the fetched messages and the next cursor.
 */
export const getMessagesForChat = async (chatId: string, limit = 50, cursor?: number): Promise<{ messages: Message[], nextCursor: number | null }> => {
    await wait(500); // Simulate network delay

    let collection = db.messages
        .where('chatId').equals(chatId)
        .reverse(); // Newest first

    if (cursor) {
        collection = collection.and(msg => msg.timestamp.getTime() < cursor);
    }

    const messages = await collection.limit(limit).toArray();
    
    const nextCursor = messages.length === limit
        ? messages[messages.length - 1].timestamp.getTime()
        : null;

    return { messages: messages.reverse(), nextCursor }; // Oldest first for display
};

/**
 * Sends a new message to a chat.
 * @param chatId - The ID of the chat.
 * @param senderId - The ID of the user sending the message.
 * @param content - The text content of the message.
 * @returns The newly created message object.
 */
export const sendMessage = async (chatId: string, senderId: string, content: string): Promise<Message> => {
    await wait(300); // Simulate sending delay
    
    const newMessage: Message = {
        id: uuidv4(),
        chatId,
        senderId,
        content,
        timestamp: new Date(),
        isEvent: false,
        status: 'sent', // Initial status
    };

    await db.transaction('rw', db.messages, db.chats, async () => {
        await db.messages.add(newMessage);
        await db.chats.update(chatId, { lastMessage: newMessage });
    });

    return newMessage;
};

/**
 * Marks all messages in a chat as "seen" for a specific user.
 * @param chatId - The ID of the chat.
 * @param userId - The ID of the user who has seen the messages.
 */
export const markMessagesAsSeen = async (chatId: string, userId: string): Promise<void> => {
    await wait(100);
    
    // In a real backend, this would be more complex.
    // Here we'll just update the chat's unread count.
    await db.chats.update(chatId, { unreadCount: 0 });

    // We can also update the status of messages sent by OTHERS to "seen" by the current user
    // But for the scope of this step, updating unreadCount is sufficient.
};

/**
 * Fetches all chats for a given user.
 * This is an example of a direct API call. In the app, we'll often use useLiveQuery for real-time updates.
 * @param userId - The ID of the user.
 * @returns A promise that resolves to an array of chats, sorted by the most recent message.
 */
export const getChatsForUser = async (userId: string): Promise<Chat[]> => {
    await wait(700); // Simulate network delay
    const chats = await db.chats.where('participantIds').equals(userId).toArray();
    
    // Sort by last message timestamp, descending
    return chats.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp.getTime() || 0;
        const timeB = b.lastMessage?.timestamp.getTime() || 0;
        return timeB - timeA;
    });
};

// --- OPEN WORLD API (UPDATED) ---

/**
 * Fetches all available open worlds from the database.
 * @returns A promise that resolves to an array of OpenWorld objects.
 */
export const getOpenWorlds = async (): Promise<OpenWorld[]> => {
    await wait(800); // Simulate network delay
    return db.openWorlds.toArray();
};

/**
 * Simulates joining a world, validating the password if required.
 * @param worldId - The ID of the world to join.
 * @param password - The password provided by the user (if any).
 * @returns The joined OpenWorld object.
 * @throws An error if the world is not found or the password is incorrect.
 */
export const joinWorld = async (worldId: string, password?: string): Promise<OpenWorld> => {
    await wait(1000); // Simulate joining delay
    const world = await db.openWorlds.get(worldId);

    if (!world) {
        throw new Error("World not found.");
    }

    if (world.isPasswordProtected && world.password !== password) {
        throw new Error("Invalid password.");
    }

    return world;
};

/**
 * Sends a message to an open world chat.
 * For simplicity, we'll reuse the Message model and add it to the DB.
 * The chatId will be the worldId.
 */
export const sendWorldMessage = async (worldId: string, senderId: string, content: string): Promise<Message> => {
    await wait(200);
    const newMessage: Message = {
        id: uuidv4(),
        chatId: worldId, // Using worldId as chatId
        senderId,
        content,
        timestamp: new Date(),
        isEvent: false,
    };
    await db.messages.add(newMessage);
    return newMessage;
};

// --- THEME API ---

/**
 * Fetches all saved custom themes from the database.
 */
export const getThemes = async (): Promise<ThemeConfig[]> => {
    await wait(300);
    return db.themes.toArray();
};

/**
 * Saves a new custom theme to the database.
 */
export const saveTheme = async (theme: Omit<ThemeConfig, 'id'>): Promise<ThemeConfig> => {
    await wait(500);
    const newTheme = { ...theme, id: uuidv4() };
    await db.themes.add(newTheme);
    return newTheme;
};

// --- FRIEND & GROUP API ---

export const searchUsers = async (query: string, currentUserId: string): Promise<User[]> => {
    await wait(400);
    if (!query) return [];
    return db.users
        .where('name').startsWithIgnoreCase(query)
        .filter(user => user.id !== currentUserId)
        .limit(10)
        .toArray();
};

export const sendFriendRequest = async (fromUserId: string, toUserId: string): Promise<FriendRequest> => {
    await wait(500);
    const existingRequest = await db.friendRequests
        .where({ fromUserId, toUserId })
        .or('fromUserId').equals(toUserId).and(fr => fr.toUserId === fromUserId)
        .first();

    if (existingRequest) throw new Error("Friend request already exists or you are already friends.");

    const newRequest: FriendRequest = { id: uuidv4(), fromUserId, toUserId, status: 'pending', createdAt: new Date() };
    await db.friendRequests.add(newRequest);
    return newRequest;
};

export const getFriendRequests = async (toUserId: string): Promise<FriendRequest[]> => {
    await wait(300);
    return db.friendRequests.where({ toUserId, status: 'pending' }).toArray();
};

export const updateFriendRequestStatus = async (requestId: string, status: 'accepted' | 'rejected'): Promise<void> => {
    await wait(600);
    await db.transaction('rw', db.friendRequests, db.users, async () => {
        const request = await db.friendRequests.get(requestId);
        if (!request) throw new Error("Request not found.");

        await db.friendRequests.update(requestId, { status });

        if (status === 'accepted') {
            const { fromUserId, toUserId } = request;
            const fromUser = await db.users.get(fromUserId);
            const toUser = await db.users.get(toUserId);

            if (!fromUser || !toUser) throw new Error("User not found.");

            await db.users.update(fromUserId, { friends: [...fromUser.friends, toUserId] });
            await db.users.update(toUserId, { friends: [...toUser.friends, fromUserId] });
        }
    });
};

export const getFriends = async (userId: string): Promise<User[]> => {
    await wait(300);
    const user = await db.users.get(userId);
    if (!user || !user.friends.length) return [];
    return db.users.where('id').anyOf(user.friends).toArray();
};

export const removeFriend = async (userId: string, friendId: string): Promise<void> => {
    await wait(600);
    await db.transaction('rw', db.users, async () => {
        const user = await db.users.get(userId);
        const friend = await db.users.get(friendId);
        if (!user || !friend) throw new Error("User not found.");

        await db.users.update(userId, { friends: user.friends.filter(id => id !== friendId) });
        await db.users.update(friendId, { friends: friend.friends.filter(id => id !== userId) });
    });
};

export const createChat = async (participantIds: string[], currentUserId: string, groupName?: string): Promise<Chat> => {
    await wait(800);
    const allParticipantIds = [...new Set([currentUserId, ...participantIds])];

    const isGroup = allParticipantIds.length > 2;

    // For 1-on-1 chats, check if a chat already exists
    if (!isGroup) {
        const existingChat = await db.chats.filter(chat => 
            !chat.isGroup &&
            chat.participantIds.length === 2 &&
            chat.participantIds.includes(allParticipantIds[0]) &&
            chat.participantIds.includes(allParticipantIds[1])
        ).first();
        if (existingChat) return existingChat;
    }
    
    const initialMessageContent = isGroup ? `${(await db.users.get(currentUserId))?.name} created the group "${groupName}".` : "Chat started.";
    
    const initialMessage: Message = {
        id: uuidv4(),
        chatId: '', // Will be set below
        senderId: 'system',
        content: initialMessageContent,
        timestamp: new Date(),
        isEvent: true
    };
    
    const newChat: Chat = {
        id: uuidv4(),
        isGroup,
        participantIds: allParticipantIds,
        unreadCount: 0,
        lastMessage: initialMessage
    };
    
    if (isGroup) {
        newChat.name = groupName || 'New Group';
        newChat.creatorId = currentUserId;
        newChat.avatar = `https://i.pravatar.cc/150?u=${newChat.id}`;
    }

    initialMessage.chatId = newChat.id;

    await db.transaction('rw', db.chats, db.messages, async () => {
        await db.chats.add(newChat);
        await db.messages.add(initialMessage);
    });

    return newChat;
};

export const getChatById = async (chatId: string): Promise<Chat | undefined> => {
    return db.chats.get(chatId);
};

export const addGroupMember = async (chatId: string, userId: string): Promise<void> => {
    await wait(500);
    await db.chats.where('id').equals(chatId).modify(chat => {
        chat.participantIds.push(userId);
    });
};

export const removeGroupMember = async (chatId: string, userId: string): Promise<void> => {
    await wait(500);
    const chat = await db.chats.get(chatId);
    if (!chat) return;

    // Simple removal. A real app might need to handle ownership transfer if the creator is removed.
    await db.chats.update(chatId, { participantIds: chat.participantIds.filter(id => id !== userId) });
};

export const leaveGroup = async (chatId: string, userId: string): Promise<void> => {
    // Re-use remove logic for simplicity
    await removeGroupMember(chatId, userId);
};

export const updateGroupChat = async (chatId: string, updates: { name?: string; avatar?: string; }): Promise<void> => {
    await wait(500);
    await db.chats.update(chatId, updates);
};

export const getChatPartner = async (chat: Chat, currentUserId: string): Promise<User | undefined> => {
    if (chat.isGroup) return undefined;
    const partnerId = chat.participantIds.find(id => id !== currentUserId);
    if (!partnerId) return undefined;
    return await db.users.get(partnerId);
};
