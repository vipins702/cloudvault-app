import { Platform } from 'react-native';

const COMPUTER_IP = "192.168.29.46";

// If you have an ngrok URL, put it in EXPO_PUBLIC_API_URL in your .env
export const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' 
  ? "http://localhost:5000" 
  : `http://${COMPUTER_IP}:5000`);
