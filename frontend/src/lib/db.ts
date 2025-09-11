import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type { QuikChatTables, User, Chat, Message, FriendRequest, OpenWorld, ThemeConfig } from '../types';

/**
 * Dexie-based database class for QuikChat.
 * This class manages all local IndexedDB storage, acting as a simulated backend.
 * It defines tables for users, chats, messages, and other application data.
 */
export class QuikChatDB extends Dexie {
  users!: QuikChatTables['users'];
  chats!: QuikChatTables['chats'];
  messages!: QuikChatTables['messages'];
  friendRequests!: QuikChatTables['friendRequests'];
  openWorlds!: QuikChatTables['openWorlds'];
  themes!: QuikChatTables['themes'];

  constructor() {
    super('QuikChatDB');
    this.version(1).stores({
      users: 'id, email, name',
      chats: 'id, *participantIds', // Indexed on participantIds for quick lookup
      messages: 'id, chatId, timestamp', // Indexed on chatId and timestamp for pagination
      friendRequests: 'id, fromUserId, toUserId',
      openWorlds: 'id',
      themes: 'id, name',
    });
  }
}

export const db = new QuikChatDB();

/**
 * Seeds the database with initial mock data if it's empty.
 * This function creates a set of users, chats, and messages to provide a realistic
 * starting point for the application.
 */
export const seedDatabase = async () => {
  const userCount = await db.users.count();
  if (userCount > 0) {
    console.log('Database already seeded.');
    return;
  }
  console.log('Seeding database...');

  // 1. Create Mock Users
  const usersToCreate: Omit<User, 'id' | 'createdAt' | 'friends' | 'isOnline'>[] = [
    { name: 'Alice', email: 'alice@quikchat.dev', passwordHash: 'password', avatar: 'https://i.pravatar.cc/150?u=alice' },
    { name: 'Bob', email: 'bob@quikchat.dev', passwordHash: 'password', avatar: 'https://i.pravatar.cc/150?u=bob' },
    { name: 'Charlie', email: 'charlie@quikchat.dev', passwordHash: 'password', avatar: 'https://i.pravatar.cc/150?u=charlie' },
    { name: 'Diana', email: 'diana@quikchat.dev', passwordHash: 'password', avatar: 'https://i.pravatar.cc/150?u=diana' },
    { name: 'Eve', email: 'eve@quikchat.dev', passwordHash: 'password', avatar: 'https://i.pravatar.cc/150?u=eve' },
    { name: 'Frank', email: 'frank@quikchat.dev', passwordHash: 'password', avatar: 'https://i.pravatar.cc/150?u=frank' },
    { name: 'Grace', email: 'grace@quikchat.dev', passwordHash: 'password', avatar: 'https://i.pravatar.cc/150?u=grace' },
  ];

  const createdUsers = await Promise.all(
    usersToCreate.map(async (u) => {
      const user: User = {
        ...u,
        id: uuidv4(),
        createdAt: new Date(),
        isOnline: Math.random() > 0.5,
        friends: [],
      };
      await db.users.add(user);
      return user;
    })
  );

  const [alice, bob, charlie, diana, eve, frank, grace] = createdUsers;

  // Make everyone friends with each other (except for specific cases for friend requests)
  for (const user of createdUsers) {
    user.friends = createdUsers.filter(u => u.id !== user.id).map(u => u.id);
    await db.users.update(user.id, { friends: user.friends });
  }

  // 2. Create Chats and Messages
  const now = Date.now();

  // Chat between Alice and Bob
  const chatAliceBobId = uuidv4();
  const messagesAliceBob: Message[] = [
    { id: uuidv4(), chatId: chatAliceBobId, senderId: alice.id, content: 'Hey Bob, how are you?', timestamp: new Date(now - 1000 * 60 * 5), isEvent: false, status: 'seen' },
    { id: uuidv4(), chatId: chatAliceBobId, senderId: bob.id, content: 'Doing great, Alice! Just working on the new project. How about you?', timestamp: new Date(now - 1000 * 60 * 4), isEvent: false },
    { id: uuidv4(), chatId: chatAliceBobId, senderId: alice.id, content: 'Same here. It\'s going well!', timestamp: new Date(now - 1000 * 60 * 3), isEvent: false, status: 'delivered' },
  ];
  const chatAliceBob: Chat = {
    id: chatAliceBobId,
    isGroup: false,
    participantIds: [alice.id, bob.id],
    lastMessage: messagesAliceBob[messagesAliceBob.length - 1],
    unreadCount: 1, // Bob has 1 unread from Alice
  };

  // Chat between Alice and Charlie
  const chatAliceCharlieId = uuidv4();
  const messagesAliceCharlie: Message[] = [
    { id: uuidv4(), chatId: chatAliceCharlieId, senderId: charlie.id, content: 'Hey, did you see the latest design mockups?', timestamp: new Date(now - 1000 * 60 * 30), isEvent: false },
    { id: uuidv4(), chatId: chatAliceCharlieId, senderId: alice.id, content: 'Oh, not yet! Sending them over?', timestamp: new Date(now - 1000 * 60 * 29), isEvent: false, status: 'sent' },
  ];
  const chatAliceCharlie: Chat = {
    id: chatAliceCharlieId,
    isGroup: false,
    participantIds: [alice.id, charlie.id],
    lastMessage: messagesAliceCharlie[messagesAliceCharlie.length - 1],
    unreadCount: 0,
  };

  // Group Chat: "Project Phoenix" (Alice, Bob, Charlie, Diana)
  const chatPhoenixGroupId = uuidv4();
  const messagesPhoenixGroup: Message[] = [
    { id: uuidv4(), chatId: chatPhoenixGroupId, senderId: diana.id, content: 'Welcome to the Project Phoenix group chat!', timestamp: new Date(now - 1000 * 60 * 120), isEvent: false },
    { id: uuidv4(), chatId: chatPhoenixGroupId, senderId: alice.id, content: 'Glad to be here!', timestamp: new Date(now - 1000 * 60 * 119), isEvent: false, status: 'seen' },
    { id: uuidv4(), chatId: chatPhoenixGroupId, senderId: bob.id, content: 'Let\'s get this done! 💪', timestamp: new Date(now - 1000 * 60 * 118), isEvent: false },
    { id: uuidv4(), chatId: chatPhoenixGroupId, senderId: 'system', content: `${charlie.name} was added to the group.`, timestamp: new Date(now - 1000 * 60 * 60), isEvent: true },
    { id: uuidv4(), chatId: chatPhoenixGroupId, senderId: charlie.id, content: 'Hey everyone!', timestamp: new Date(now - 1000 * 60 * 59), isEvent: false },
  ];
  const chatPhoenixGroup: Chat = {
    id: chatPhoenixGroupId,
    isGroup: true,
    name: 'Project Phoenix',
    avatar: 'https://i.pravatar.cc/150?u=group-phoenix',
    creatorId: diana.id,
    participantIds: [alice.id, bob.id, charlie.id, diana.id],
    lastMessage: messagesPhoenixGroup[messagesPhoenixGroup.length - 1],
    unreadCount: 2, // 2 unread messages for Alice
  };
  
  // Chat between Alice and Eve (Alice has a pending friend request from Eve, they are friends in the DB for now)
  const chatAliceEveId = uuidv4();
  const messagesAliceEve: Message[] = [
      { id: uuidv4(), chatId: chatAliceEveId, senderId: eve.id, content: 'Hi Alice, remember me?', timestamp: new Date(now - 1000 * 60 * 15), isEvent: false },
      { id: uuidv4(), chatId: chatAliceEveId, senderId: alice.id, content: 'Hey Eve! Long time no see. How are you?', timestamp: new Date(now - 1000 * 60 * 14), isEvent: false, status: 'sent' },
  ];
  const chatAliceEve: Chat = {
      id: chatAliceEveId,
      isGroup: false,
      participantIds: [alice.id, eve.id],
      lastMessage: messagesAliceEve[messagesAliceEve.length - 1],
      unreadCount: 0,
  };


  await db.chats.bulkAdd([chatAliceBob, chatAliceCharlie, chatPhoenixGroup, chatAliceEve]);
  await db.messages.bulkAdd([...messagesAliceBob, ...messagesAliceCharlie, ...messagesPhoenixGroup, ...messagesAliceEve]);
  
  // 3. Create Friend Requests
  // Friend request for Alice from Frank (Alice and Frank are not friends yet)
  // First, remove Frank from Alice's friends and vice versa
  alice.friends = alice.friends.filter(id => id !== frank.id);
  frank.friends = frank.friends.filter(id => id !== alice.id);
  await db.users.update(alice.id, { friends: alice.friends });
  await db.users.update(frank.id, { friends: frank.friends });

  const friendRequestAliceFrank: FriendRequest = {
    id: uuidv4(),
    fromUserId: frank.id,
    toUserId: alice.id,
    status: 'pending',
    createdAt: new Date(now - 1000 * 60 * 60 * 24), // 1 day ago
  };
  await db.friendRequests.add(friendRequestAliceFrank);

  // 4. Create Open Worlds
  const worlds: OpenWorld[] = [
    { id: 'nexus-prime', name: 'Nexus Prime', description: 'The central hub for all travelers. A bustling city of light and technology.', imageUrl: 'https://picsum.photos/seed/nexus/400/300', population: 137, isPasswordProtected: false },
    { id: 'serene-valley', name: 'Serene Valley', description: 'A peaceful world of lush forests and tranquil rivers. Perfect for relaxation.', imageUrl: 'https://picsum.photos/seed/serene/400/300', population: 42, isPasswordProtected: false },
    { id: 'cyber-abyss', name: 'Cyber Abyss', description: 'A high-stakes, neon-drenched world. Only for the brave and skilled.', imageUrl: 'https://picsum.photos/seed/cyber/400/300', population: 88, isPasswordProtected: true, password: 'password123' },
  ];
  await db.openWorlds.bulkAdd(worlds);

  // 5. Seed default themes
  const defaultThemes: ThemeConfig[] = [
      {
          id: 'light',
          name: 'Light (Default)',
          colors: {
              background: { primary: '#ffffff', secondary: '#f1f5f9' },
              text: { primary: '#020817', secondary: '#64748b' },
              border: '#e2e8f0',
              primary: { accent: '#2563eb' },
              secondary: { accent: '#475569' },
              status: { success: '#22c55e', warning: '#f97316', error: '#ef4444', info: '#3b82f6' },
          },
      },
      {
          id: 'dark',
          name: 'Dark',
          colors: {
              background: { primary: '#18181b', secondary: '#27272a' },
              text: { primary: '#fafafa', secondary: '#a1a1aa' },
              border: '#3f3f46',
              primary: { accent: '#60a5fa' },
              secondary: { accent: '#a1a1aa' },
              status: { success: '#4ade80', warning: '#fcd34d', error: '#f87171', info: '#60a5fa' },
          },
      },
  ];
  await db.themes.bulkAdd(defaultThemes);


  console.log('Database seeding complete.');
};
