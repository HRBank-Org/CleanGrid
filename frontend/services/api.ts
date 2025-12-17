import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Platform-compatible token storage
const getToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      // Use localStorage for web
      return localStorage.getItem('token');
    } else {
      // Use AsyncStorage for mobile
      return await AsyncStorage.getItem('token');
    }
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const setToken = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem('token', token);
    } else {
      await AsyncStorage.setItem('token', token);
    }
  } catch (error) {
    console.error('Error setting token:', error);
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem('token');
    } else {
      await AsyncStorage.removeItem('token');
    }
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error in request interceptor:', error);
  }
  return config;
});

export default api;