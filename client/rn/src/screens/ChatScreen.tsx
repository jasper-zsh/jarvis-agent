import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useTransport } from '../services/TransportContext';
import { useGlassesConnection } from '../services/GlassesConnectionContext';
import ConversationDisplay from '../components/ConversationDisplay';
import EventsPanel from '../components/EventsPanel';
import ConnectionControls from '../components/ConnectionControls';
import AudioControls from '../components/AudioControls';

const ChatScreen: React.FC = () => {
  const {
    connectionStatus,
    error,
    transcripts,
    events,
    connect,
    disconnect,
    clearTranscripts,
    clearEvents,
  } = useTransport();

  const { isConnected: glassesConnected } = useGlassesConnection();
  const [showEvents, setShowEvents] = useState(true);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleClearConversation = () => {
    clearTranscripts();
    clearEvents();
  };

  const getAudioRouting = (): 'glasses' | 'phone' => {
    return glassesConnected ? 'glasses' : 'phone';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearConversation}
          disabled={transcripts.length === 0 && events.length === 0}
        >
          <Text
            style={[
              styles.clearButtonText,
              (transcripts.length === 0 && events.length === 0) &&
                styles.clearButtonDisabled,
            ]}
          >
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Conversation Display */}
        <View style={styles.conversationContainer}>
          <ConversationDisplay transcripts={transcripts} />
        </View>

        {/* Events Panel */}
        {showEvents && (
          <View style={styles.eventsContainer}>
            <EventsPanel
              events={events}
              onClear={clearEvents}
              visible={showEvents}
            />
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* Connection Controls */}
        <ConnectionControls
          connectionStatus={connectionStatus}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          error={error}
        />

        {/* Audio Controls */}
        <AudioControls audioRouting={getAudioRouting()} />

        {/* Toggle Events Panel */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowEvents(!showEvents)}
        >
          <Text style={styles.toggleButtonText}>
            {showEvents ? 'Hide Events' : 'Show Events'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  clearButtonDisabled: {
    color: '#BDBDBD',
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  conversationContainer: {
    flex: 1,
  },
  eventsContainer: {
    flex: 0,
  },
  controlsContainer: {
    backgroundColor: '#FFFFFF',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  toggleButtonText: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
  },
});

export default ChatScreen;
