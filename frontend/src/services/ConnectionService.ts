import { useConnectionStore } from '../store/useConnectionStore';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import type { Message, MessageDTO, WebsocketMessage } from '../types';
import { db } from '../lib/db';
import { pollMessages } from '../api/messageApi';
import toast from 'react-hot-toast';
import axios from 'axios';

const WEBSOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/api/ws';
const WS_RECONNECT_TIMEOUT = 60 * 1000; // 60 seconds

class ConnectionService {
  private ws: WebSocket | null = null;
  private accessToken: string | null = null;
  // private reconnectTimer: NodeJS.Timeout | null = null;
  // private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private longPollController: AbortController | null = null;
  private wsConnectionAttemptTime: number | null = null;

  initialize(token: string) {
    if (this.accessToken === token && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    this.cleanup(); // Clean up any existing connections
    this.accessToken = token;
    this.connectWebSocket();
  }

  cleanup() {
    this.ws?.close();
    this.ws = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.longPollController) this.longPollController.abort();
    this.accessToken = null;
    useConnectionStore.getState().setStatus('disconnected');
    useConnectionStore.getState().setTransport('none');
  }

  sendMessage(message: WebsocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      toast.error('Not connected. Message queued.');
      // The message is already in the DB as 'pending'
      // We will add it to the messageQueue for explicit retry later
      db.messageQueue.put({ tempId: (message.payload as any).tempId, payload: message, attempts: 0 });
    }
  }


  private connectWebSocket() {
    if (!this.accessToken) return;

    useConnectionStore.getState().setStatus('connecting');
    this.wsConnectionAttemptTime = Date.now();
    const authenticatedUrl = `${WEBSOCKET_URL}?token=${this.accessToken}`;
    this.ws = new WebSocket(authenticatedUrl);

    this.ws.onopen = () => this.onWsOpen();
    this.ws.onmessage = (event) => this.onWsMessage(event);
    this.ws.onclose = () => this.onWsClose();
    this.ws.onerror = (error) => console.error('WebSocket error:', error);
  }

  private onWsOpen() {
    console.log('WebSocket connected');
    useConnectionStore.getState().setStatus('connected');
    useConnectionStore.getState().setTransport('websocket');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.longPollController) this.longPollController.abort();
    this.startHeartbeat();
    this.processMessageQueue();
  }

  private onWsMessage(event: MessageEvent) {
    const wsMessage: WebsocketMessage = JSON.parse(event.data);
    const { updateMessageStatus, addMessage } = useChatStore.getState();
    const userId = (useAuthStore.getState() as any).user?.id

    switch (wsMessage.type) {
      case 'NEW_MESSAGE':
        const messageDTO = wsMessage.payload as MessageDTO;
        const message: Message = { ...messageDTO, tempId: '', chatId: messageDTO.senderId === userId ? messageDTO.recipientId! : messageDTO.senderId };
        addMessage(message.chatId, message, false);
        // Acknowledge delivery
        this.sendMessage({ type: 'MESSAGE_ACK', payload: { messageId: message.id, status: 'delivered', userId } });
        break;
      case 'MESSAGE_SENT_ACK':
        updateMessageStatus(wsMessage.payload.tempId, wsMessage.payload.messageId, 'sent', wsMessage.payload.createdAt);
        break;
      case 'PONG':
        // Heartbeat response
        break;
    }
  }

  private onWsClose() {
    console.log('WebSocket disconnected');
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    const timeSinceAttempt = Date.now() - (this.wsConnectionAttemptTime || Date.now());

    if (timeSinceAttempt > WS_RECONNECT_TIMEOUT) {
      console.log('WebSocket failed to connect for over 60s. Starting long polling.');
      this.startLongPolling();
    } else {
      const remainingTimeout = WS_RECONNECT_TIMEOUT - timeSinceAttempt;
      console.log(`Will switch to long polling in ${remainingTimeout / 1000}s if WS doesn't connect.`);
      this.reconnectTimer = setTimeout(() => this.startLongPolling(), remainingTimeout);
    }

    // Also, always try to reconnect WebSocket in the background
    setTimeout(() => this.connectWebSocket(), 5000);
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000);
  }

  private async processMessageQueue() {
    const queuedMessages = await db.messageQueue.toArray();
    for (const item of queuedMessages) {
      this.sendMessage(item.payload);
      db.messageQueue.delete(item.tempId);
    }
  }

  private async startLongPolling() {
    if (useConnectionStore.getState().transport === 'polling') return; // Already polling

    useConnectionStore.getState().setStatus('connected'); // Considered "connected" via polling
    useConnectionStore.getState().setTransport('polling');

    this.longPollController = new AbortController();
    const { signal } = this.longPollController;

    const poll = async () => {
      if (signal.aborted) return;
      try {
        const messages = await pollMessages(signal);
        const { addMessage } = useChatStore.getState();
        const userId = (useAuthStore.getState() as any).user?.id;

        messages.forEach(dto => {
          const message: Message = { ...dto, tempId: '', chatId: dto.senderId === userId ? dto.recipientId! : dto.senderId };
          addMessage(message.chatId, message, false);
          // Acknowledge delivery via WS (if it comes back up) or a separate HTTP call (omitted for now)
        });

        poll(); // Immediately poll again
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error('Long poll error:', error);
          // Wait before retrying on error
          await new Promise(resolve => setTimeout(resolve, 5000));
          poll();
        }
      }
    };

    poll();
  }
}

export const connectionService = new ConnectionService();
