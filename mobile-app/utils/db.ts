import { Platform } from 'react-native';
import { Storage } from './storage';
import { BACKEND_URL } from './constants';

export const DbService = {
  // NEW: Pure Proxy fetch from Backend
  fetchUnifiedGallery: async () => {
    try {
      const token = await Storage.getItem('authToken');
      if (!token) return [];

      const response = await fetch(`${BACKEND_URL}/api/cloud/photos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const blobs = await response.json();
      
      // SAFETY CHECK: Ensure blobs is an array
      if (!Array.isArray(blobs)) {
        console.error('Backend returned non-array:', blobs);
        return [];
      }
      
      // The new SaaS Master Backend returns fully unified and formatted CloudAsset objects.
      // We no longer need to map over raw Vercel properties like `pathname`.
      return blobs;
    } catch (err) {
      console.error('API Bridge Error:', err);
      return [];
    }
  },

  fetchConnections: async () => {
    const token = await Storage.getItem('authToken');
    const res = await fetch(`${BACKEND_URL}/api/connections`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  }
};
