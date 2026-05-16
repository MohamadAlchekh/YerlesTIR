const API_BASE_URL = 'http://localhost:8000/api';

export const api = {
  // Get list of available containers
  getContainers: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/containers`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching containers:', error);
      throw error;
    }
  },

  // Post products for optimization
  optimize: async (containerType, products) => {
    try {
      const response = await fetch(`${API_BASE_URL}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          container_type: containerType,
          products: products
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error optimizing packing:', error);
      throw error;
    }
  }
};
