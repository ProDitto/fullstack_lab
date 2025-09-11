import { useAuthStore } from '../store/authStore';

/**
 * Custom hook to provide simplified access to the authentication state and actions
 * from the `useAuthStore`. This is a convenience hook to avoid importing the store
 * directly in components.
 *
 * @returns An object containing the authentication state (`currentUser`, `isAuthenticated`,
 * `isLoading`, `error`) and actions (`login`, `register`, `logout`, etc.).
 */
export const useAuth = () => {
  const authState = useAuthStore();
  return authState;
};
