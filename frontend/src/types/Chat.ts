export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'seen';

// Represents a message in the UI and IndexedDB
export interface Message {
  id: string;
  tempId: string; // Used for optimistic UI updates
  chatId: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content: string;
  createdAt: string; // ISO 8601 string
  status: MessageStatus;
}

// Represents the data transfer object from the backend REST API
export interface MessageDTO {
  id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'seen';
}


export interface Group {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  members: string[]; // array of user IDs
}

export interface Friend {
    id: string; // user ID of the friend
    email: string;
    profilePictureUrl?: string | null;
}

export interface WebsocketMessage {
    type: string;
    payload: any;
}

export interface QueuedMessage {
    tempId: string;
    payload: WebsocketMessage;
    attempts: number;
}
