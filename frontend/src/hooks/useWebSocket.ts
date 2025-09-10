import { useEffect, useRef, useCallback } from 'react';
import { useConnectionStore } from '../store/useConnectionStore';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import type { WebsocketMessage } from '../types';

const WEBSOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/api/ws';

export const useWebSocket = () => {
    const ws = useRef<WebSocket | null>(null);
    const { setStatus, setTransport } = useConnectionStore();
    const addMessage = useChatStore(state => state.addMessage);
    const accessToken = useAuthStore(state => state.accessToken);
    // const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
    const reconnectInterval = useRef<number | null>(null);

    const connect = useCallback(() => {
        if (!accessToken || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
            return;
        }

        const authenticatedUrl = `${WEBSOCKET_URL}?token=${accessToken}`;
        ws.current = new WebSocket(authenticatedUrl);
        setStatus('connecting');

        ws.current.onopen = () => {
            console.log('WebSocket connected');
            setStatus('connected');
            setTransport('websocket');
            if (reconnectInterval.current) {
                clearInterval(reconnectInterval.current);
                reconnectInterval.current = null;
            }
            // Start heartbeat
        };

        ws.current.onmessage = (event) => {
            const message: WebsocketMessage = JSON.parse(event.data);
            if (message.type === 'NEW_MESSAGE') {
                // Here you would add logic to add the message to the correct chat
                // For now, let's assume a generic addMessage function handles it
                // addMessage(message.payload);
            }
        };

        ws.current.onclose = () => {
            console.log('WebSocket disconnected');
            setStatus('disconnected');
            if (!reconnectInterval.current) {
               reconnectInterval.current = setInterval(() => {
                    console.log('Attempting to reconnect WebSocket...');
                    connect();
                }, 5000);
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            ws.current?.close();
        };

    }, [accessToken, setStatus, setTransport, addMessage]);

    const disconnect = useCallback(() => {
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
        if (reconnectInterval.current) {
            clearInterval(reconnectInterval.current);
            reconnectInterval.current = null;
        }
    }, []);

    const sendMessage = useCallback((message: WebsocketMessage) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else {
            // Handle offline case: queue message or show error
            console.error("WebSocket is not connected. Message not sent.");
        }
    }, []);

    useEffect(() => {
        if (accessToken) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [accessToken, connect, disconnect]);

    return { sendMessage };
};
