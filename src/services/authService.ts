// src/services/authService.ts
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STATE_KEY = '@auth_state';

interface AuthResponse {
  success: boolean;
  user?: any;
  error?: string;
}

export const signUp = async (email: string, pin: string): Promise<AuthResponse> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pin);
    await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify({
      user: {
        uid: result.user.uid,
        email: result.user.email,
        emailVerified: result.user.emailVerified
      }
    }));
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const login = async (email: string, pin: string): Promise<AuthResponse> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pin);
    await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify({
      user: {
        uid: result.user.uid,
        email: result.user.email,
        emailVerified: result.user.emailVerified
      }
    }));
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
    await AsyncStorage.removeItem(AUTH_STATE_KEY);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const getAuthState = async () => {
  try {
    const authState = await AsyncStorage.getItem(AUTH_STATE_KEY);
    return authState ? JSON.parse(authState) : null;
  } catch (error) {
    console.error('Error getting auth state:', error);
    return null;
  }
};
