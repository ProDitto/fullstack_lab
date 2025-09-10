import type { PaginatedResponse, MessageDTO } from '../types';
import { api } from './client';

export const getPendingMessages = async (cursor?: string): Promise<PaginatedResponse<MessageDTO>> => {
  const { data } = await api.get('/messages/pending', {
    params: { cursor, limit: 20 },
  });
  return data;
};

export const pollMessages = async (signal: AbortSignal): Promise<MessageDTO[]> => {
    const { data } = await api.get('/messages/poll', { signal });
    return data;
}
