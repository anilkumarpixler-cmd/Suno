import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = '8002';

const lanHost = Constants.expoConfig?.hostUri?.split(':')[0];

const fallbackBase = lanHost
  ? `http://${lanHost}:${API_PORT}`
  : Platform.OS === 'android'
    ? `http://10.0.2.2:${API_PORT}`
    : `http://localhost:${API_PORT}`;

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || fallbackBase).replace(/\/$/, '');
