import { api } from './client';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types';

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/login', credentials);
  return data;
};

export const register = async (registerData: RegisterData): Promise<User> => {
  const { data } = await api.post<User>('/auth/register', registerData);
  return data;
};

export const refreshToken = async (token: string): Promise<{ accessToken: string; refreshToken: string }> => {
  const { data } = await api.post('/auth/refresh', { refreshToken: token });
  return data;
};

export const getMe = async (): Promise<User> => {
    const { data } = await api.get<User>('/users/me');
    return data;
}
