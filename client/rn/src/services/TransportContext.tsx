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
  final?: boolean;
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

  // State tracking for message replacement logic
  const [receivedFinalUserMessage, setReceivedFinalUserMessage] = useState<boolean>(false);
  const [botStartedSpeaking, setBotStartedSpeaking] = useState<boolean>(false);
  const [botStoppedSpeaking, setBotStoppedSpeaking] = useState<boolean>(false);

  // Refs to avoid stale closure issues in addTranscript callback
  const receivedFinalUserMessageRef = useRef<boolean>(receivedFinalUserMessage);
  const botStartedSpeakingRef = useRef<boolean>(botStartedSpeaking);
  const botStoppedSpeakingRef = useRef<boolean>(botStoppedSpeaking);

  const mediaManagerRef = useRef<MediaManager | null>(null);
  const transportRef = useRef<RNSmallWebRTCTransport | null>(null);
  const configRef = useRef<any>(null);

  // Keep refs synchronized with state to avoid stale closure issues
  useEffect(() => {
    receivedFinalUserMessageRef.current = receivedFinalUserMessage;
  }, [receivedFinalUserMessage]);

  useEffect(() => {
    botStartedSpeakingRef.current = botStartedSpeaking;
  }, [botStartedSpeaking]);

  useEffect(() => {
    botStoppedSpeakingRef.current = botStoppedSpeaking;
  }, [botStoppedSpeaking]);

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
  const addTranscript = useCallback((role: 'user' | 'bot', text: string, final: boolean = true) => {
    console.log('TransportContext: addTranscript called - role:', role, 'final:', final, 'text:', text);
    setTranscripts((prev) => {
      console.log('TransportContext: addTranscript - current messages count:', prev.length);
      
      // Handle user messages
      if (role === 'user') {
        // Check if we should create a new user message (after final user message + bot started speaking)
        const shouldCreateNewUserMessage = receivedFinalUserMessageRef.current;

        if (shouldCreateNewUserMessage) {
          setReceivedFinalUserMessage(false);
        }
        
        // Find the last user message index
        let lastUserMessageIndex = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === 'user') {
            lastUserMessageIndex = i;
            break;
          }
        }
        
        if (lastUserMessageIndex !== -1 && !shouldCreateNewUserMessage) {
          const lastUserMessage = prev[lastUserMessageIndex];
          console.log('TransportContext: addTranscript - last user message:', {
            text: lastUserMessage.text,
            final: lastUserMessage.final,
            shouldCreateNewUserMessage
          });
          
          // Replace the last user message
          console.log('TransportContext: addTranscript - REPLACING last user message');
          const updated = [...prev];
          updated[lastUserMessageIndex] = {
            ...lastUserMessage,
            text,
            timestamp: new Date(),
            final,
          };
          return updated;
        } else {
          console.log('TransportContext: addTranscript - CREATING new user message, shouldCreateNewUserMessage:', shouldCreateNewUserMessage);
        }
      }
      
      // Handle bot messages
      if (role === 'bot') {
        // Check if we should create a new bot message (after bot stopped speaking)
        const shouldCreateNewBotMessage = botStoppedSpeakingRef.current;
        
        // If we should create a new message, reset the flag
        if (shouldCreateNewBotMessage && final) {
          setBotStoppedSpeaking(false);
        }
        
        // Find the last bot message index
        let lastBotMessageIndex = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === 'bot') {
            lastBotMessageIndex = i;
            break;
          }
        }
        
        if (lastBotMessageIndex !== -1 && !shouldCreateNewBotMessage) {
          const lastBotMessage = prev[lastBotMessageIndex];
          console.log('TransportContext: addTranscript - last bot message:', {
            text: lastBotMessage.text,
            final: lastBotMessage.final,
            shouldCreateNewBotMessage
          });
          
          // Append to the last bot message
          console.log('TransportContext: addTranscript - APPENDING to last bot message');
          const updated = [...prev];
          updated[lastBotMessageIndex] = {
            ...lastBotMessage,
            text: lastBotMessage.text + text,
            timestamp: new Date(),
            final,
          };
          return updated;
        } else {
          console.log('TransportContext: addTranscript - CREATING new bot message, shouldCreateNewBotMessage:', shouldCreateNewBotMessage);
        }
      }
      
      console.log('TransportContext: addTranscript - CREATING new message');
      // Otherwise, add a new message
      const newMessage: TranscriptMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role,
        text,
        timestamp: new Date(),
        final,
      };
      return [...prev, newMessage];
    });
  }, []); // Empty dependency array - using refs to avoid stale closure

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
          setBotStartedSpeaking(true);
          addEvent('bot', 'Bot started speaking');
        },
        onBotStoppedSpeaking: () => {
          console.log('TransportContext: Bot stopped speaking');
          setBotStoppedSpeaking(true);
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
          console.log('TransportContext: User transcript - final field:', (data as any).final);
          const text = data.text || '';
          const final = (data as any).final !== undefined ? (data as any).final : true;
          console.log('TransportContext: User transcript - parsed final:', final, 'text:', text);
          if (text) {
            addTranscript('user', text, final);
            addEvent('transcript', `User: ${text}`);
            // Track when we receive a final user message
            if (final) {
              setReceivedFinalUserMessage(true);
            }
          }
        },
        onBotOutput: (data) => {
          console.log('TransportContext: Bot output', data);
          const text = data.text || '';
          const final = (data as any).final !== undefined ? (data as any).final : true;
          if (text) {
            addTranscript('bot', text, final);
            addEvent('transcript', `Bot: ${text}`);
          }
        },
        onBotTranscript: (data) => {
          console.log('TransportContext: Bot transcript', data);
          const text = data.text || '';
          const final = (data as any).final !== undefined ? (data as any).final : true;
          if (text) {
            addTranscript('bot', text, final);
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
