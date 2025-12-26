import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import type { SystemEvent } from '../services/TransportContext';

interface EventsPanelProps {
  events: SystemEvent[];
  onClear?: () => void;
  visible?: boolean;
}

const EventsPanel: React.FC<EventsPanelProps> = ({
  events,
  onClear,
  visible = true,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollViewRef.current && visible) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [events, visible]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventColor = (type: string): string => {
    switch (type) {
      case 'connection':
        return '#2196F3';
      case 'error':
        return '#F44336';
      case 'bot':
        return '#9C27B0';
      case 'user':
        return '#4CAF50';
      case 'transcript':
        return '#FF9800';
      case 'transport':
        return '#00BCD4';
      default:
        return '#757575';
    }
  };

  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'connection':
        return '🔗';
      case 'error':
        return '❌';
      case 'bot':
        return '🤖';
      case 'user':
        return '👤';
      case 'transcript':
        return '💬';
      case 'transport':
        return '📡';
      default:
        return 'ℹ️';
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>System Events</Text>
        {events.length > 0 && onClear && (
          <TouchableOpacity style={styles.clearButton} onPress={onClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events yet</Text>
          </View>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventItem}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventIcon}>{getEventIcon(event.type)}</Text>
                <Text
                  style={[
                    styles.eventType,
                    { color: getEventColor(event.type) },
                  ]}
                >
                  {event.type}
                </Text>
                <Text style={styles.eventTime}>{formatTime(event.timestamp)}</Text>
              </View>
              <Text style={styles.eventMessage}>{event.message}</Text>
              {event.data && (
                <Text style={styles.eventData}>
                  {JSON.stringify(event.data, null, 2)}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    maxHeight: 250,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9E9E9E',
  },
  eventItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E0E0E0',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  eventType: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
    textTransform: 'capitalize',
  },
  eventTime: {
    fontSize: 11,
    color: '#9E9E9E',
    marginLeft: 'auto',
  },
  eventMessage: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
  },
  eventData: {
    fontSize: 11,
    color: '#757575',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default EventsPanel;
