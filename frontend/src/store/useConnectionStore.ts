import { create } from 'zustand';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';
type Transport = 'websocket' | 'polling' | 'none';

interface ConnectionState {
  status: ConnectionStatus;
  transport: Transport;
  setStatus: (status: ConnectionStatus) => void;
  setTransport: (transport: Transport) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  transport: 'none',
  setStatus: (status) => set({ status }),
  setTransport: (transport) => set({ transport }),
}));
