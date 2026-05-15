import { Platform } from 'react-native';

const COMPUTER_IP = "192.168.29.46";

// Use localhost for local development, Vercel for production
export const BACKEND_URL = Platform.OS === 'web' ? "http://localhost:5000" : `http://${COMPUTER_IP}:5000`;
// export const BACKEND_URL = "https://cloudvault-app.vercel.app";
