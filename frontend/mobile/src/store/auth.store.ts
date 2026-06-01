import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  userId: string | null;
  username: string | null;
  pinHash: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setAuth: (token: string, refreshToken: string, userId: string, username: string) => Promise<void>;
  savePin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

function hashPin(pin: string): string {
  // Simple hash for demo — use bcrypt in production
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  userId: null,
  username: null,
  pinHash: null,
  isAuthenticated: false,
  hydrated: false,

  setAuth: async (token, refreshToken, userId, username) => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    await SecureStore.setItemAsync('userId', userId);
    await SecureStore.setItemAsync('username', username);
    set({ token, refreshToken, userId, username, isAuthenticated: true });
  },

  savePin: async (pin: string) => {
    const hash = hashPin(pin);
    await SecureStore.setItemAsync('pinHash', hash);
    set({ pinHash: hash });
  },

  verifyPin: async (pin: string) => {
    const stored = await SecureStore.getItemAsync('pinHash');
    if (!stored) return false;
    return hashPin(pin) === stored;
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ token: null, refreshToken: null, userId: null, username: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    const token = await SecureStore.getItemAsync('token');
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    const userId = await SecureStore.getItemAsync('userId');
    const username = await SecureStore.getItemAsync('username');
    const pinHash = await SecureStore.getItemAsync('pinHash');
    if (token && userId) {
      set({ token, refreshToken, userId, username, pinHash, isAuthenticated: true, hydrated: true });
    } else {
      set({ pinHash, hydrated: true });
    }
  },
}));
