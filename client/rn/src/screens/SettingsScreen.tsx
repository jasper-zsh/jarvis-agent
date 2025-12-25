import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RokidCxrClientM from 'react-native-rokid-cxr-client-m';
import {
  BluetoothDevice,
  CxrBluetoothErrorCode,
  CxrStatus,
  GlassInfo,
  BatteryLevel,
  BrightnessEvent,
  VolumeUpdateEvent,
} from 'react-native-rokid-cxr-client-m/src/NativeRokidCxrClientM';
import {
  PERMISSIONS,
  RESULTS,
  request,
  check,
  openSettings,
} from 'react-native-permissions';

// Create event emitter for the native module
const RokidCxrEventEmitter = new NativeEventEmitter(RokidCxrClientM as any);

const PAIRED_DEVICE_STORAGE_KEY = '@jarvis:paired_glasses_device';

interface PairedDevice {
  deviceName: string;
  deviceAddress: string;
  socketUuid: string;
  macAddress: string;
  rokidAccount: string;
  glassesType: number;
}

interface SavedDevice {
  name: string;
  address: string;
  socketUuid?: string;
  macAddress?: string;
}

const SettingsScreen: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<SavedDevice | null>(null);
  const [pairedDevice, setPairedDevice] = useState<PairedDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Not connected');
  const [brightness, setBrightness] = useState<number | null>(null);
  const [volume, setVolume] = useState<number | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);

  const scanningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request Bluetooth permissions
  const requestBluetoothPermissions = async (): Promise<boolean> => {
    setIsCheckingPermissions(true);
    
    try {
      if (Platform.OS === 'android') {
        // Android 12+ (API 31+) requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
        // Android <12 may use location permissions for BLE
        const permissionsToRequest = [
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
          PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
        ];

        for (const permission of permissionsToRequest) {
          const status = await check(permission);
          
          if (status === RESULTS.GRANTED) {
            continue;
          } else if (status === RESULTS.DENIED) {
            const result = await request(permission);
            if (result !== RESULTS.GRANTED) {
              Alert.alert(
                'Permission Required',
                'Bluetooth permissions are required to scan for and connect to glasses devices. Please grant the permissions to continue.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'OK', onPress: () => {} },
                ]
              );
              return false;
            }
          } else if (status === RESULTS.BLOCKED || status === RESULTS.LIMITED) {
            Alert.alert(
              'Permission Blocked',
              'Bluetooth permissions have been permanently denied. Please open app settings to enable them.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => openSettings() },
              ]
            );
            return false;
          } else if (status === RESULTS.UNAVAILABLE) {
            Alert.alert(
              'Feature Unavailable',
              'Bluetooth is not available on this device.',
              [{ text: 'OK' }]
            );
            return false;
          }
        }
      } else if (Platform.OS === 'ios') {
        // iOS requires BLUETOOTH permission
        const status = await check(PERMISSIONS.IOS.BLUETOOTH);
        
        if (status === RESULTS.GRANTED) {
          return true;
        } else if (status === RESULTS.DENIED) {
          const result = await request(PERMISSIONS.IOS.BLUETOOTH);
          if (result !== RESULTS.GRANTED) {
            Alert.alert(
              'Permission Required',
              'Bluetooth permission is required to scan for and connect to glasses devices. Please grant the permission to continue.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'OK', onPress: () => {} },
              ]
            );
            return false;
          }
        } else if (status === RESULTS.BLOCKED || status === RESULTS.LIMITED) {
          Alert.alert(
            'Permission Blocked',
            'Bluetooth permission has been permanently denied. Please open app settings to enable it.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => openSettings() },
            ]
          );
          return false;
        } else if (status === RESULTS.UNAVAILABLE) {
          Alert.alert(
            'Feature Unavailable',
            'Bluetooth is not available on this device.',
            [{ text: 'OK' }]
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking permissions:', error);
      Alert.alert(
        'Error',
        'An error occurred while checking permissions. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  // Load paired device on mount
  useEffect(() => {
    loadPairedDevice();
    checkCurrentConnection();

    // Set up event listeners
    const batterySubscription = RokidCxrEventEmitter.addListener(
      'onBatteryLevelUpdated',
      (data: BatteryLevel) => {
        setBatteryLevel(data.value);
        setIsCharging(data.charging);
      }
    );

    const brightnessSubscription = RokidCxrEventEmitter.addListener(
      'onBrightnessUpdated',
      (data: BrightnessEvent) => {
        setBrightness(data.value);
      }
    );

    const volumeSubscription = RokidCxrEventEmitter.addListener(
      'onVolumeUpdated',
      (data: VolumeUpdateEvent) => {
        setVolume(data.value);
      }
    );

    // Bluetooth connection event listeners
    const connectedSubscription = RokidCxrEventEmitter.addListener(
      'BluetoothOnConnected',
      () => {
        setIsConnected(true);
        setConnectionStatus('Connected');
        setIsConnecting(false);
        fetchGlassInfo();
      }
    );

    const disconnectedSubscription = RokidCxrEventEmitter.addListener(
      'BluetoothOnDisconnected',
      () => {
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        setIsConnecting(false);
        setBatteryLevel(null);
        setBrightness(null);
        setVolume(null);
      }
    );

    const failedSubscription = RokidCxrEventEmitter.addListener(
      'BluetoothOnFailed',
      (errorCode: number) => {
        setIsConnected(false);
        setConnectionStatus(getErrorMessage(errorCode));
        setIsConnecting(false);
        setBatteryLevel(null);
        setBrightness(null);
        setVolume(null);
        Alert.alert('Connection Failed', getErrorMessage(errorCode));
      }
    );

    // Cleanup on unmount
    return () => {
      batterySubscription.remove();
      brightnessSubscription.remove();
      volumeSubscription.remove();
      connectedSubscription.remove();
      disconnectedSubscription.remove();
      failedSubscription.remove();
      if (scanningTimeoutRef.current) {
        clearTimeout(scanningTimeoutRef.current);
      }
      if (isScanning) {
        RokidCxrClientM.stopScanGlasses();
      }
    };
  }, [isScanning]);

  // Load paired device from AsyncStorage
  const loadPairedDevice = async () => {
    try {
      const pairedDeviceJson = await AsyncStorage.getItem(PAIRED_DEVICE_STORAGE_KEY);
      if (pairedDeviceJson) {
        const device: PairedDevice = JSON.parse(pairedDeviceJson);
        setPairedDevice(device);
        setConnectedDevice({
          name: device.deviceName,
          address: device.deviceAddress,
          socketUuid: device.socketUuid,
          macAddress: device.macAddress,
        });
        setConnectionStatus('Paired (disconnected)');
      }
    } catch (error) {
      console.error('Failed to load paired device:', error);
    }
  };

  // Check current connection status
  const checkCurrentConnection = () => {
    try {
      const connected = RokidCxrClientM.isBluetoothConnected();
      setIsConnected(connected);
      if (connected) {
        setConnectionStatus('Connected');
        fetchGlassInfo();
      } else {
        setConnectionStatus('Not connected');
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
    }
  };

  // Connect to paired device using saved connection info
  const connectToPairedDevice = () => {
    if (!pairedDevice) {
      Alert.alert('No Paired Device', 'No paired device found. Please pair a device first.');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('Connecting...');

    RokidCxrClientM.connectBluetooth(
      pairedDevice.socketUuid,
      pairedDevice.macAddress,
      (socketUuid, macAddress, rokidAccount, glassesType) => {
        console.log('Connection info received during reconnect:', { socketUuid, macAddress });
      },
      () => {
        setIsConnected(true);
        setConnectionStatus('Connected');
        setIsConnecting(false);
        fetchGlassInfo();
      },
      () => {
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        setIsConnecting(false);
        setBatteryLevel(null);
        setBrightness(null);
        setVolume(null);
      },
      (errorCode) => {
        setIsConnected(false);
        setConnectionStatus(getErrorMessage(errorCode));
        setIsConnecting(false);
        setBatteryLevel(null);
        setBrightness(null);
        setVolume(null);
        Alert.alert('Connection Failed', getErrorMessage(errorCode));
      }
    );
  };

  // Fetch glass info
  const fetchGlassInfo = () => {
    console.log('Fetching glass info...');
    RokidCxrClientM.getGlassInfo((status: CxrStatus, info: GlassInfo) => {
      console.log('getGlassInfo callback - status:', status, 'info:', info);
      console.log(typeof status)
      if (status === 'RESPONSE_SUCCEED' && info) {
        console.log('Glass info received - battery:', info.batteryLevel, 'brightness:', info.brightness, 'volume:', info.volume);
        setBatteryLevel(info.batteryLevel);
        setIsCharging(info.isCharging);
        setBrightness(info.brightness);
        setVolume(info.volume);
      } else {
        console.warn('getGlassInfo failed - status:', status, 'info:', info);
      }
    });
  };

  // Start scanning for glasses
  const startScan = async () => {
    if (isScanning) return;

    // Check permissions before scanning
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      setConnectionStatus('Permissions not granted');
      return;
    }

    setIsScanning(true);
    setScannedDevices([]);
    setConnectionStatus('Scanning...');

    RokidCxrClientM.startScanGlasses(
      (device: BluetoothDevice) => {
        setScannedDevices((prev) => {
          const exists = prev.some((d) => d.address === device.address);
          if (!exists) {
            return [...prev, device];
          }
          return prev;
        });
      },
      (errorCode: number) => {
        setIsScanning(false);
        setConnectionStatus(`Scan failed: ${getErrorMessage(errorCode)}`);
        Alert.alert('Scan Failed', getErrorMessage(errorCode));
      }
    );

    // Auto-stop scanning after 10 seconds
    scanningTimeoutRef.current = setTimeout(() => {
      if (isScanning) {
        stopScan();
      }
    }, 10000);
  };

  // Stop scanning
  const stopScan = () => {
    if (scanningTimeoutRef.current) {
      clearTimeout(scanningTimeoutRef.current);
      scanningTimeoutRef.current = null;
    }
    setIsScanning(false);
    RokidCxrClientM.stopScanGlasses();
    setConnectionStatus(scannedDevices.length > 0 ? 'Devices found' : 'Not connected');
  };

  // Pair a device using initBluetooth
  const pairDevice = async (device: BluetoothDevice) => {
    // Check permissions before pairing
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      setConnectionStatus('Permissions not granted');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('Pairing...');
    stopScan();

    // Call initBluetooth to start pairing with callbacks
    RokidCxrClientM.initBluetooth(
      device,
      async (socketUuid, macAddress, rokidAccount, glassesType) => {
        console.log('Connection info received:', { socketUuid, macAddress });
        
        // Create paired device object
        const newPairedDevice: PairedDevice = {
          deviceName: device.name,
          deviceAddress: device.address,
          socketUuid,
          macAddress,
          rokidAccount,
          glassesType,
        };

        // Save to AsyncStorage
        await AsyncStorage.setItem(PAIRED_DEVICE_STORAGE_KEY, JSON.stringify(newPairedDevice));
        
        // Update state
        setPairedDevice(newPairedDevice);
        setConnectedDevice({
          name: device.name,
          address: device.address,
          socketUuid,
          macAddress,
        });

        // Now connect using the received info
        setConnectionStatus('Connecting...');
        RokidCxrClientM.connectBluetooth(
          socketUuid,
          macAddress,
          (socketUuid, macAddress, rokidAccount, glassesType) => {
            console.log('Connection info received during connect:', { socketUuid, macAddress });
          },
          () => {
            setIsConnected(true);
            setConnectionStatus('Connected');
            setIsConnecting(false);
            fetchGlassInfo();
          },
          () => {
            setIsConnected(false);
            setConnectionStatus('Disconnected');
            setIsConnecting(false);
            setBatteryLevel(null);
            setBrightness(null);
            setVolume(null);
          },
          (errorCode) => {
            setIsConnected(false);
            setConnectionStatus(getErrorMessage(errorCode));
            setIsConnecting(false);
            setBatteryLevel(null);
            setBrightness(null);
            setVolume(null);
            Alert.alert('Connection Failed', getErrorMessage(errorCode));
          }
        );
      },
      () => {
        setIsConnected(true);
        setConnectionStatus('Connected');
        setIsConnecting(false);
        fetchGlassInfo();
      },
      () => {
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        setIsConnecting(false);
        setBatteryLevel(null);
        setBrightness(null);
        setVolume(null);
      },
      (errorCode) => {
        setIsConnected(false);
        setConnectionStatus(getErrorMessage(errorCode));
        setIsConnecting(false);
        setBatteryLevel(null);
        setBrightness(null);
        setVolume(null);
        Alert.alert('Connection Failed', getErrorMessage(errorCode));
      }
    );
  };

  // Unpair the current device using deinitBluetooth
  const unpairDevice = async () => {
    try {
      // Call deinitBluetooth to un-pair
      RokidCxrClientM.deinitBluetooth();
      
      // Clear persisted data
      await AsyncStorage.removeItem(PAIRED_DEVICE_STORAGE_KEY);
      
      // Clear state
      setPairedDevice(null);
      setConnectedDevice(null);
      setIsConnected(false);
      setIsConnecting(false);
      setBatteryLevel(null);
      setBrightness(null);
      setVolume(null);
      setConnectionStatus('Disconnected');
      
      Alert.alert('Unpaired', 'Device has been unpaired successfully.');
    } catch (error) {
      console.error('Failed to unpair device:', error);
      Alert.alert('Error', 'Failed to unpair device. Please try again.');
    }
  };

  // Disconnect from current device without unpairing
  // Note: The native module doesn't have a disconnect method, so we use deinitBluetooth
  // but keep the paired device info to allow reconnection
  const disconnect = () => {
    RokidCxrClientM.deinitBluetooth();
    setIsConnected(false);
    setIsConnecting(false);
    setBatteryLevel(null);
    setBrightness(null);
    setVolume(null);
    setConnectionStatus(pairedDevice ? 'Paired (disconnected)' : 'Disconnected');
  };

  // Get error message from error code
  const getErrorMessage = (errorCode: CxrBluetoothErrorCode | number): string => {
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
  };

  // Render connection status indicator
  const renderStatusIndicator = () => {
    let color = '#9E9E9E'; // gray for disconnected
    let statusText = 'Disconnected';

    if (isConnected) {
      color = '#4CAF50'; // green for connected
      statusText = 'Connected';
    } else if (isScanning) {
      color = '#2196F3'; // blue for scanning
      statusText = 'Scanning...';
    }

    return (
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    );
  };

  // Render connected/paired device info
  const renderConnectedDeviceInfo = () => {
    if (!connectedDevice) return null;

    const isDeviceConnected = isConnected;
    const isDevicePaired = !!pairedDevice;

    return (
      <View style={styles.deviceItem}>
        <View style={styles.deviceInfo}>
          <View style={styles.deviceNameContainer}>
            <Text style={styles.deviceName}>{connectedDevice.name}</Text>
            {isDeviceConnected ? (
              <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.statusBadgeText}>Connected</Text>
              </View>
            ) : isDevicePaired ? (
              <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]}>
                <Text style={styles.statusBadgeText}>Paired</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.deviceAddress}>{connectedDevice.address}</Text>
          {isDeviceConnected && batteryLevel !== null && (
            <View style={styles.batteryContainer}>
              <Text style={styles.batteryLabel}>Battery: {batteryLevel}%</Text>
              {isCharging && <Text style={styles.chargingText}> (Charging)</Text>}
            </View>
          )}
          {isDeviceConnected && brightness !== null && (
            <Text style={styles.infoText}>Brightness: {brightness}</Text>
          )}
          {isDeviceConnected && volume !== null && (
            <Text style={styles.infoText}>Volume: {volume}</Text>
          )}
        </View>
        <View style={styles.deviceActions}>
          {isDeviceConnected ? (
            <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </TouchableOpacity>
          ) : isDevicePaired && !isConnecting ? (
            <TouchableOpacity style={styles.connectButton} onPress={connectToPairedDevice}>
              <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
          ) : isConnecting ? (
            <View style={styles.connectButton}>
              <ActivityIndicator color="#FFFFFF" size="small" />
            </View>
          ) : null}
          {isDevicePaired && !isConnecting && (
            <TouchableOpacity style={styles.unpairButton} onPress={unpairDevice}>
              <Text style={styles.unpairButtonText}>Unpair</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render scanned device item
  const renderScannedDevice = (device: BluetoothDevice) => {
    const isThisDeviceConnected =
      connectedDevice?.address === device.address && isConnected;
    const isThisDevicePaired = pairedDevice?.deviceAddress === device.address;

    return (
      <TouchableOpacity
        key={device.address}
        style={[
          styles.deviceItem,
          isThisDeviceConnected && styles.connectedDeviceItem,
        ]}
        onPress={() => {
          if (isThisDeviceConnected) return;
          if (isThisDevicePaired) {
            connectToPairedDevice();
          } else {
            pairDevice(device);
          }
        }}
        disabled={isThisDeviceConnected || isConnecting}
      >
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceAddress}>{device.address}</Text>
        </View>
        {isThisDeviceConnected ? (
          <View style={styles.connectedBadge}>
            <Text style={styles.connectedBadgeText}>Connected</Text>
          </View>
        ) : isThisDevicePaired ? (
          <View style={styles.pairedBadge}>
            <Text style={styles.pairedBadgeText}>Paired</Text>
          </View>
        ) : isCheckingPermissions || isConnecting ? (
          <View style={styles.connectButton}>
            <ActivityIndicator color="#FFFFFF" size="small" />
          </View>
        ) : (
          <View style={styles.pairButton}>
            <Text style={styles.pairButtonText}>Pair</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        {renderStatusIndicator()}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Connection Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Glasses Connection</Text>
          <Text style={styles.connectionStatus}>{connectionStatus}</Text>

          {/* Scan Button */}
          {!isConnected && !isConnecting && (
            <TouchableOpacity
              style={[styles.button, (isScanning || isCheckingPermissions) && styles.buttonDisabled]}
              onPress={isScanning ? stopScan : startScan}
              disabled={isConnected || isConnecting || isCheckingPermissions}
            >
              {isScanning ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.buttonText}>Stop Scan</Text>
                </>
              ) : isCheckingPermissions ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.buttonText}>Checking Permissions...</Text>
                </>
              ) : (
                <Text style={styles.buttonText}>Scan for Glasses</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Connected Device Info */}
          {renderConnectedDeviceInfo()}

          {/* Scanned Devices List */}
          {scannedDevices.length > 0 && !isConnected && !isConnecting && (
            <View style={styles.devicesList}>
              <Text style={styles.listTitle}>
                Found Devices ({scannedDevices.length})
              </Text>
              {scannedDevices.map(renderScannedDevice)}
            </View>
          )}

          {/* No devices found message */}
          {!isScanning && scannedDevices.length === 0 && !isConnected && !isConnecting && !pairedDevice && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No devices found</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap "Scan for Glasses" to search for nearby devices
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#757575',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  connectionStatus: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  devicesList: {
    marginTop: 16,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
    marginBottom: 12,
  },
  deviceItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  deviceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  connectedDeviceItem: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  batteryLabel: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  chargingText: {
    fontSize: 14,
    color: '#FF9800',
    marginLeft: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  connectedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  connectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pairButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  pairButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pairedBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pairedBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  unpairButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unpairButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9E9E9E',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#BDBDBD',
    textAlign: 'center',
  },
});

export default SettingsScreen;
