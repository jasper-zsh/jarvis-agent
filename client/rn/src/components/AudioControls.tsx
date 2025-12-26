import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

interface AudioControlsProps {
  isMuted?: boolean;
  onToggleMute?: () => void;
  audioRouting?: 'glasses' | 'phone';
}

const AudioControls: React.FC<AudioControlsProps> = ({
  isMuted: externalIsMuted = false,
  onToggleMute,
  audioRouting = 'phone',
}) => {
  const [internalMuted, setInternalMuted] = useState(false);
  const isMuted = externalIsMuted !== undefined ? externalIsMuted : internalMuted;

  const handleToggleMute = () => {
    if (onToggleMute) {
      onToggleMute();
    } else {
      setInternalMuted(!internalMuted);
    }
  };

  const getAudioRoutingText = (): string => {
    switch (audioRouting) {
      case 'glasses':
        return 'Audio: Glasses';
      case 'phone':
        return 'Audio: Phone';
      default:
        return 'Audio: Phone';
    }
  };

  const getAudioRoutingIcon = (): string => {
    switch (audioRouting) {
      case 'glasses':
        return '👓';
      case 'phone':
        return '📱';
      default:
        return '📱';
    }
  };

  const getMuteIcon = (): string => {
    return isMuted ? '🔇' : '🎤';
  };

  return (
    <View style={styles.container}>
      <View style={styles.audioRouting}>
        <Text style={styles.audioRoutingIcon}>{getAudioRoutingIcon()}</Text>
        <Text style={styles.audioRoutingText}>{getAudioRoutingText()}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.muteButton,
          isMuted ? styles.muteButtonMuted : styles.muteButtonUnmuted,
        ]}
        onPress={handleToggleMute}
        activeOpacity={0.7}
      >
        <Text style={styles.muteIcon}>{getMuteIcon()}</Text>
        <Text style={styles.muteButtonText}>
          {isMuted ? 'Unmute' : 'Mute'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  audioRouting: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioRoutingIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  audioRoutingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#424242',
  },
  muteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  muteButtonUnmuted: {
    backgroundColor: '#FFFFFF',
    borderColor: '#2196F3',
  },
  muteButtonMuted: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  muteIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  muteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AudioControls;
