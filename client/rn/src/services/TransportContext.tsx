import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { PipecatClient, RTVIEvent, type RTVIEventCallbacks, type TransportState } from '@pipecat-ai/client-js';
import { RNSmallWebRTCTransport, MediaManager } from '@pipecat-ai/react-native-small-webrtc-transport';
import { DailyMediaManager } from '@pipecat-ai/react-native-daily-media-manager';
import { useGlassesConnection } from './GlassesConnectionContext';
import NativeRokidCxrClientM from 'react-native-rokid-cxr-client-m/src/NativeRokidCxrClientM';
import { createTransportConfig, getBotUrl } from '../config';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export interface SystemEvent {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  data?: any;
}

interface TransportContextType {
  client: PipecatClient | null;
  connectionStatus: ConnectionStatus;
  transportState: TransportState | null;
  error: string | null;
  transcripts: TranscriptMessage[];
  events: SystemEvent[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearTranscripts: () => void;
  clearEvents: () => void;
  reinitializeTransport: () => Promise<void>;
}

const TransportContext = createContext<TransportContextType | null>(null);

interface TransportProviderProps {
  children: React.ReactNode;
}

export const TransportProvider: React.FC<TransportProviderProps> = ({ children }) => {
  const [client, setClient] = useState<PipecatClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [transportState, setTransportState] = useState<TransportState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const { isConnected: glassesConnected } = useGlassesConnection();
  const [currentBotUrl, setCurrentBotUrl] = useState<string>('');

  const mediaManagerRef = useRef<MediaManager | null>(null);
  const transportRef = useRef<RNSmallWebRTCTransport | null>(null);
  const configRef = useRef<any>(null);

  // Handle audio routing based on glasses connection state
  const handleAudioRouting = useCallback(async (glassesConnected: boolean) => {
    try {
      if (glassesConnected) {
        // Glasses connected: Route audio to glasses
        console.log('TransportContext: Routing audio to glasses (Bluetooth SCO + earphone)');
        NativeRokidCxrClientM.setCommunicationDevice();
      } else {
        // Glasses disconnected: Route audio to phone
        console.log('TransportContext: Routing audio to phone (phone mic + speakers)');
        NativeRokidCxrClientM.clearCommunicationDevice();
      }
    } catch (err) {
      console.error('TransportContext: Failed to handle audio routing', err);
    }
  }, []);

  // Initialize audio routing when glasses connection changes
  useEffect(() => {
    handleAudioRouting(glassesConnected);
  }, [glassesConnected, handleAudioRouting]);

  // Add event to events list
  const addEvent = useCallback((type: string, message: string, data?: any) => {
    const newEvent: SystemEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      data,
    };
    setEvents((prev) => [...prev, newEvent]);
  }, []);

  // Add transcript message
  const addTranscript = useCallback((role: 'user' | 'bot', text: string) => {
    const newMessage: TranscriptMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      text,
      timestamp: new Date(),
    };
    setTranscripts((prev) => [...prev, newMessage]);
  }, []);

  // Clear transcripts
  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Initialize transport and client
  const initializeClient = useCallback(async () => {
    try {
      console.log('TransportContext: Initializing client...');
      
      // Get the current bot URL
      const botUrl = await getBotUrl();
      console.log('TransportContext: Bot URL:', botUrl);
      setCurrentBotUrl(botUrl);

      // Create transport configuration
      const transportConfig = await createTransportConfig();
      configRef.current = transportConfig;

      // Create media manager
      const mediaManager = new DailyMediaManager();
      mediaManagerRef.current = mediaManager;

      // Create transport with configuration
      const transport = new RNSmallWebRTCTransport({
        mediaManager,
        webrtcRequestParams: transportConfig,
      });
      transportRef.current = transport;

      // Set up event callbacks
      const callbacks: RTVIEventCallbacks = {
        onConnected: () => {
          console.log('TransportContext: Connected');
          setConnectionStatus('connected');
          setError(null);
          addEvent('connection', 'Connected to bot');
        },
        onDisconnected: () => {
          console.log('TransportContext: Disconnected');
          setConnectionStatus('disconnected');
          addEvent('connection', 'Disconnected from bot');
        },
        onError: (message) => {
          console.error('TransportContext: Error', message);
          setConnectionStatus('error');
          const errorMessage = message.data?.toString() || 'Unknown error';
          setError(errorMessage);
          addEvent('error', errorMessage, message);
        },
        onTransportStateChanged: (state) => {
          console.log('TransportContext: Transport state changed', state);
          setTransportState(state);
          addEvent('transport', `Transport state changed: ${state}`, state);
        },
        onBotReady: (botData) => {
          console.log('TransportContext: Bot ready', botData);
          addEvent('bot', 'Bot ready', botData);
        },
        onBotStartedSpeaking: () => {
          console.log('TransportContext: Bot started speaking');
          addEvent('bot', 'Bot started speaking');
        },
        onBotStoppedSpeaking: () => {
          console.log('TransportContext: Bot stopped speaking');
          addEvent('bot', 'Bot stopped speaking');
        },
        onUserStartedSpeaking: () => {
          console.log('TransportContext: User started speaking');
          addEvent('user', 'User started speaking');
        },
        onUserStoppedSpeaking: () => {
          console.log('TransportContext: User stopped speaking');
          addEvent('user', 'User stopped speaking');
        },
        onUserTranscript: (data) => {
          console.log('TransportContext: User transcript', data);
          const text = data.text || '';
          if (text) {
            addTranscript('user', text);
            addEvent('transcript', `User: ${text}`);
          }
        },
        onBotOutput: (data) => {
          console.log('TransportContext: Bot output', data);
          const text = data.text || '';
          if (text) {
            addTranscript('bot', text);
            addEvent('transcript', `Bot: ${text}`);
          }
        },
        onBotTranscript: (data) => {
          console.log('TransportContext: Bot transcript', data);
          const text = data.text || '';
          if (text) {
            addTranscript('bot', text);
            addEvent('transcript', `Bot: ${text}`);
          }
        },
      };

      // Create Pipecat client
      const pipecatClient = new PipecatClient({
        transport,
        callbacks,
        enableMic: true,
        enableCam: false,
        enableScreenShare: false,
      });

      setClient(pipecatClient);
      console.log('TransportContext: Client initialized successfully');
    } catch (err) {
      console.error('TransportContext: Failed to initialize client', err);
      setError('Failed to initialize client');
      setConnectionStatus('error');
    }
  }, [addEvent, addTranscript]);

  // Re-initialize transport (called when server configuration changes)
  const reinitializeTransport = useCallback(async () => {
    try {
      console.log('TransportContext: Re-initializing transport...');
      
      // Disconnect if connected
      if (client && connectionStatus === 'connected') {
        await client.disconnect();
        console.log('TransportContext: Disconnected before re-initialization');
      }

      // Clean up existing transport
      if (transportRef.current) {
        transportRef.current = null;
      }

      // Reset connection status
      setConnectionStatus('idle');
      setError(null);

      // Re-initialize client with new configuration
      await initializeClient();
      console.log('TransportContext: Transport re-initialized successfully');
    } catch (err) {
      console.error('TransportContext: Failed to re-initialize transport', err);
      setError('Failed to re-initialize transport');
      setConnectionStatus('error');
    }
  }, [client, connectionStatus, initializeClient]);

  // Connect to bot
  const connect = useCallback(async () => {
    if (!client) {
      console.error('TransportContext: Client not initialized');
      setError('Client not initialized');
      return;
    }

    try {
      setConnectionStatus('connecting');
      setError(null);

      // Initialize devices
      await client.initDevices();

      // Start bot and connect with current config
      const config = configRef.current || await createTransportConfig();
      await client.startBotAndConnect(config);

      console.log('TransportContext: Connected successfully');
    } catch (err) {
      console.error('TransportContext: Failed to connect', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setConnectionStatus('error');
    }
  }, [client]);

  // Disconnect from bot
  const disconnect = useCallback(async () => {
    if (!client) {
      console.warn('TransportContext: Client not initialized');
      return;
    }

    try {
      setConnectionStatus('disconnected');
      setError(null);

      await client.disconnect();

      console.log('TransportContext: Disconnected successfully');
    } catch (err) {
      console.error('TransportContext: Failed to disconnect', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  }, [client]);

  // Initialize client on mount
  useEffect(() => {
    initializeClient();

    return () => {
      // Cleanup on unmount
      if (client) {
        client.disconnect().catch((err) => {
          console.error('TransportContext: Failed to disconnect on unmount', err);
        });
      }
    };
  }, []); // Empty dependency array - initialize only once

  const contextValue: TransportContextType = {
    client,
    connectionStatus,
    transportState,
    error,
    transcripts,
    events,
    connect,
    disconnect,
    clearTranscripts,
    clearEvents,
    reinitializeTransport,
  };

  return (
    <TransportContext.Provider value={contextValue}>
      {children}
    </TransportContext.Provider>
  );
};

export const useTransport = (): TransportContextType => {
  const context = useContext(TransportContext);
  if (!context) {
    throw new Error('useTransport must be used within a TransportProvider');
  }
  return context;
};
