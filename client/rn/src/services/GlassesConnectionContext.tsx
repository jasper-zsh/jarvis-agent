import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeEventEmitter, NativeModules } from 'react-native';
import NativeRokidCxrClientM from 'react-native-rokid-cxr-client-m/src/NativeRokidCxrClientM';
import { CxrBluetoothErrorCode, type SceneStatusInfo } from 'react-native-rokid-cxr-client-m/src/NativeRokidCxrClientM';
import RokidCxrClientM from 'react-native-rokid-cxr-client-m';

const PAIRED_DEVICE_STORAGE_KEY = '@jarvis:paired_glasses_device';

// Create event emitter for the native module
const RokidCxrEventEmitter = new NativeEventEmitter(NativeRokidCxrClientM as any);

interface PairedDevice {
  deviceName: string;
  deviceAddress: string;
  socketUuid: string;
  macAddress: string;
  rokidAccount: string;
  glassesType: number;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface GlassesConnectionContextType {
  isConnected: boolean;
  pairedDevice: PairedDevice | null;
  connectionStatus: ConnectionStatus;
  error: string | null;
  sceneStatus: SceneStatusInfo | null;
}

const GlassesConnectionContext = createContext<GlassesConnectionContextType | null>(null);

interface GlassesConnectionProviderProps {
  children: React.ReactNode;
}

export const GlassesConnectionProvider: React.FC<GlassesConnectionProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [pairedDevice, setPairedDevice] = useState<PairedDevice | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sceneStatus, setSceneStatus] = useState<SceneStatusInfo | null>(null);

  // Send ASR content to glasses
  const sendAsrContent = useCallback((text: string) => {
    try {
      NativeRokidCxrClientM.sendAsrContent(text);
      console.log('GlassesConnectionContext: Sent ASR content to glasses:', text);
    } catch (err) {
      console.error('GlassesConnectionContext: Failed to send ASR content', err);
    }
  }, []);

  // Send TTS content to glasses
  const sendTtsContent = useCallback((text: string) => {
    try {
      NativeRokidCxrClientM.sendTtsContent(text);
      console.log('GlassesConnectionContext: Sent TTS content to glasses:', text);
    } catch (err) {
      console.error('GlassesConnectionContext: Failed to send TTS content', err);
    }
  }, []);

  // Get error message from error code
  const getErrorMessage = useCallback((errorCode: CxrBluetoothErrorCode): string => {
    switch (errorCode) {
      case 'SUCCEED':
        return 'Success';
      case 'PARAM_INVALID':
        return 'Invalid parameters';
      case 'BLE_CONNECT_FAILED':
        return 'BLE connection failed';
      case 'SOCKET_CONNECT_FAILED':
        return 'Socket connection failed';
      case 'UNKNOWN':
      default:
        return 'Unknown error occurred';
    }
  }, []);

  // Load paired device from AsyncStorage
  const loadPairedDevice = useCallback(async () => {
    try {
      const pairedDeviceJson = await AsyncStorage.getItem(PAIRED_DEVICE_STORAGE_KEY);
      if (pairedDeviceJson) {
        const device: PairedDevice = JSON.parse(pairedDeviceJson);
        setPairedDevice(device);
        return device;
      }
      return null;
    } catch (error) {
      console.error('Failed to load paired device:', error);
      setError('Failed to load paired device');
      return null;
    }
  }, []);

  // Connect to paired device using saved connection info
  const connectToPairedDevice = useCallback(async (device: PairedDevice) => {
    if (!device) {
      console.warn('No paired device to connect to');
      return;
    }

    setConnectionStatus('connecting');
    setError(null);

    NativeRokidCxrClientM.connectBluetooth(
      device.socketUuid,
      device.macAddress,
      (socketUuid, macAddress, rokidAccount, glassesType) => {
        console.log('Connection info received during auto-connect:', { socketUuid, macAddress });
      },
      () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
      },
      () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setError(null);
      },
      (errorCode) => {
        setIsConnected(false);
        setConnectionStatus('error');
        setError(getErrorMessage(errorCode));
        console.error('Auto-connection failed:', getErrorMessage(errorCode));
      }
    );
  }, [getErrorMessage]);

  // Check current connection status
  const checkCurrentConnection = useCallback(() => {
    try {
      const connected = NativeRokidCxrClientM.isBluetoothConnected();
      setIsConnected(connected);
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      return connected;
    } catch (error) {
      console.error('Failed to check connection status:', error);
      setError('Failed to check connection status');
      return false;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      // Load paired device
      const device = await loadPairedDevice();
      if (!mounted) return;

      // Check if already connected
      const currentlyConnected = checkCurrentConnection();
      if (!mounted) return;

      // If not connected and a paired device exists, try to auto-connect
      if (!currentlyConnected && device) {
        console.log('Attempting auto-connect to paired device:', device.deviceName);
        connectToPairedDevice(device);
      } else if (currentlyConnected) {
        console.log('Glasses already connected');
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('idle');
      }
    };

    initialize();

    // Set up event listener for scene status updates
    const sceneStatusSubscription = RokidCxrClientM.onSceneStatusUpdated(
      (statusInfo: SceneStatusInfo) => {
        if (mounted) {
          console.log('GlassesConnectionContext: Scene status updated:', statusInfo);
          setSceneStatus(statusInfo);
        }
      }
    );

    // Cleanup on unmount
    return () => {
      mounted = false;
      sceneStatusSubscription.remove();
    };
  }, [loadPairedDevice, checkCurrentConnection, connectToPairedDevice, getErrorMessage]);

  const contextValue: GlassesConnectionContextType = {
    isConnected,
    pairedDevice,
    connectionStatus,
    error,
    sceneStatus,
  };

  return (
    <GlassesConnectionContext.Provider value={contextValue}>
      {children}
    </GlassesConnectionContext.Provider>
  );
};

export const useGlassesConnection = (): GlassesConnectionContextType => {
  const context = useContext(GlassesConnectionContext);
  if (!context) {
    throw new Error('useGlassesConnection must be used within a GlassesConnectionProvider');
  }
  return context;
};
