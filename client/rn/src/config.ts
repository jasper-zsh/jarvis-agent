/**
 * Project configuration
 * Bot configuration for React Native client
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { APIRequest } from '@pipecat-ai/client-js';

// Storage key for server configuration
const SERVER_URL_KEY = '@jarvis:server_url';

// Default value
const DEFAULT_SERVER_URL = 'http://localhost:7860';

// Note: For React Native, environment variables should be configured via
// react-native-config or similar. This is a placeholder for future configuration.
const botStartPublicApiKey: string | undefined = undefined;

/**
 * Get the current bot URL based on stored configuration
 * @returns Promise<string> The full bot URL with /start appended
 */
export async function getBotUrl(): Promise<string> {
  try {
    const serverUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
    const url = serverUrl || DEFAULT_SERVER_URL;
    
    // Ensure the URL ends with /start
    return url.endsWith('/start') ? url : `${url}/start`;
  } catch (error) {
    console.error('Failed to get bot URL from storage:', error);
    return `${DEFAULT_SERVER_URL}/start`;
  }
}

/**
 * Save server configuration
 * @param serverUrl - Full server URL (e.g., http://localhost:7860)
 * @returns Promise<void>
 */
export async function saveServerConfig(serverUrl: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SERVER_URL_KEY, serverUrl);
  } catch (error) {
    console.error('Failed to save server config:', error);
    throw error;
  }
}

/**
 * Get the current server URL
 * @returns Promise<string> The server URL
 */
export async function getServerUrl(): Promise<string> {
  try {
    const serverUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
    return serverUrl || DEFAULT_SERVER_URL;
  } catch (error) {
    console.error('Failed to get server URL:', error);
    return DEFAULT_SERVER_URL;
  }
}

/**
 * Create transport configuration with dynamic bot URL
 * @returns Promise<APIRequest> The transport configuration
 */
export async function createTransportConfig(): Promise<APIRequest> {
  const botStartUrl = await getBotUrl();
  
  const smallWebRTCConfig: APIRequest = {
    endpoint: botStartUrl,
  };

  if (botStartPublicApiKey) {
    smallWebRTCConfig.headers = new Headers({
      Authorization: `Bearer ${botStartPublicApiKey}`,
    });
  }

  return smallWebRTCConfig;
}

// Legacy export for backward compatibility (will be deprecated)
// This uses default values, but dynamic config should be used instead
const botStartUrl = `${DEFAULT_SERVER_URL}/start`;

const smallWebRTCConfig: APIRequest = {
  endpoint: botStartUrl,
  requestData: {
    createDailyRoom: false,
    enableDefaultIceServers: true,
    transport: 'webrtc',
  },
};

if (botStartPublicApiKey) {
  smallWebRTCConfig.headers = new Headers({
    Authorization: `Bearer ${botStartPublicApiKey}`,
  });
}

export const TRANSPORT_CONFIG: APIRequest = smallWebRTCConfig;
