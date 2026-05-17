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

      // Check response status
      if (!response.ok) {
        const errText = await response.text();
        console.error('Backend error response:', response.status, errText);
        return [];
      }

      const contentType = response.headers.get('content-type') || '';
      let blobs;
      if (contentType.includes('application/json')) {
        blobs = await response.json();
      } else {
        const text = await response.text();
        console.error('Unexpected non-JSON response:', text);
        return [];
      }
      
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
