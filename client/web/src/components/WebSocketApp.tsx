import { useEffect, useState } from 'react';
import { PipecatClient } from '@pipecat-ai/client-js';
import { WebSocketTransport } from '@pipecat-ai/websocket-transport';
import { WavMediaManager } from '@pipecat-ai/websocket-transport';
import { PipecatClientProvider } from '@pipecat-ai/client-react';
import {
  ConnectButton,
  ConversationPanel,
  EventsPanel,
  UserAudioControl,
} from '@pipecat-ai/voice-ui-kit';
import { ConversationProvider } from '@pipecat-ai/voice-ui-kit';
import { WEBSOCKET_URL } from '../config';

interface WebSocketAppProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const WebSocketApp = ({ onConnect, onDisconnect }: WebSocketAppProps) => {
  const [client, setClient] = useState<PipecatClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initClient = async () => {
      try {
        const mediaManager = new WavMediaManager();
        const transport = new WebSocketTransport({
          mediaManager,
          wsUrl: WEBSOCKET_URL,
        });

        const pipecatClient = new PipecatClient({
          transport,
        });

        // Initialize devices first
        await transport.initDevices();
        
        setClient(pipecatClient);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize client');
      }
    };

    initClient();

    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, []);

  const handleConnect = async () => {
    if (!client) return;

    try {
      await client.connect();
      setIsConnected(true);
      onConnect?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  };

  const handleDisconnect = async () => {
    if (!client) return;

    try {
      await client.disconnect();
      setIsConnected(false);
      onDisconnect?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Initializing...</div>
      </div>
    );
  }

  return (
    <PipecatClientProvider client={client}>
      <ConversationProvider>
        <div className="flex flex-col w-full h-full">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="text-lg font-semibold">WebSocket Transport</div>
            <div className="flex items-center gap-4">
              <UserAudioControl size="lg" />
              <ConnectButton
                size="lg"
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            </div>
          </div>
          <div className="flex-1 overflow-hidden px-4">
            <div className="h-full overflow-hidden">
              <ConversationPanel />
            </div>
          </div>
          <div className="h-96 overflow-hidden px-4 pb-4">
            <EventsPanel />
          </div>
        </div>
      </ConversationProvider>
    </PipecatClientProvider>
  );
};
