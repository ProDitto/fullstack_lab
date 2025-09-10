import Dexie, { type Table } from 'dexie';
import type { User, Group, Message, Friend, QueuedMessage } from '../types';

export class ChatDexie extends Dexie {
  users!: Table<User, string>;
  groups!: Table<Group, string>;
  messages!: Table<Message, string>;
  friends!: Table<Friend, string>;
  messageQueue!: Table<QueuedMessage, string>;

  constructor() {
    super('ChatterboxDB');
    this.version(1).stores({
      users: 'id, email',
      groups: 'id, slug',
      messages: '++id, tempId, createdAt, chatId',
      friends: 'id',
      messageQueue: 'tempId',
    });
  }
}

export const db = new ChatDexie();
