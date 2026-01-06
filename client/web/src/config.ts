/**
 * Project configuration
 */

const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:7860/agent';

if (!import.meta.env.VITE_WEBSOCKET_URL) {
  console.warn(
    'VITE_WEBSOCKET_URL not configured, using default: ws://localhost:7860/agent'
  );
}

export const WEBSOCKET_URL = websocketUrl;