import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AudioSource, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

interface AudioPlayerProps {
  source?: AudioSource;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSkip: (seconds: number) => void;
  onRestart: () => void;
  onEnd: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  source = null,
  isPlaying,
  onTogglePlay,
  onSeek,
  onSkip,
  onRestart,
  onEnd,
}) => {
  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!source) return;
    if (isPlaying && !status.playing) {
      player.play();
    } else if (!isPlaying && status.playing) {
      player.pause();
    }
  }, [isPlaying, player, source, status.playing]);

  useEffect(() => {
    if (source && status.didJustFinish) onEnd();
  }, [onEnd, source, status.didJustFinish]);

  const seek = (seconds: number) => {
    if (source) void player.seekTo(seconds);
    onSeek(seconds);
  };

  const skip = (seconds: number) => {
    if (source) void player.seekTo(Math.max(0, player.currentTime + seconds));
    onSkip(seconds);
  };

  const togglePlay = () => {
    if (source) {
      if (status.playing) player.pause();
      else player.play();
    }
    onTogglePlay();
  };

  return (
    <View style={styles.controlsRow} accessibilityLabel="Audio player controls">
      <TouchableOpacity onPress={() => seek(0)} accessibilityRole="button" accessibilityLabel="Restart audio">
        <Text style={styles.ctrlIcon}>⏮</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => skip(-10)} accessibilityRole="button" accessibilityLabel="Rewind 10 seconds">
        <Text style={styles.ctrlIcon}>⏪</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.mainPlayBtn}
        onPress={togglePlay}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}>
        <Text style={styles.mainPlayIcon}>{isPlaying ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => skip(10)} accessibilityRole="button" accessibilityLabel="Forward 10 seconds">
        <Text style={styles.ctrlIcon}>⏩</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onEnd} accessibilityRole="button" accessibilityLabel="Skip to end">
        <Text style={styles.ctrlIcon}>⏭</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '80%' },
  ctrlIcon: { fontSize: 22, color: '#FFFFFF' },
  mainPlayBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPlayIcon: { color: '#FFFFFF', fontSize: 24 },
});