// API service for Solana Blink API
const API_BASE_URL = 'http://localhost:3000';

/**
 * Create a new Blink API
 * @param {Object} data - The data to create a blink API
 * @param {string} data.channelName - Name of the channel
 * @param {string} data.description - Description of the channel
 * @param {number} data.fee - Fee in SOL
 * @param {string} data.publicKey - Solana public key for receiving payments
 * @param {string} data.coverImage - Optional cover image URL
 * @param {string} data.link - Telegram channel link
 * @returns {Promise<Object>} - Response with route and channelName
 */
export const createBlinkApi = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/blink/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create Blink API');
    }
    
    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Get information about a specific Blink API
 * @param {string} channelName - The channel name
 * @returns {Promise<Object>} - Blink API information
 */
export const getBlinkApiInfo = async (channelName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/${channelName}`);
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to get Blink API information');
    }
    
    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export default {
  createBlinkApi,
  getBlinkApiInfo,
}; 