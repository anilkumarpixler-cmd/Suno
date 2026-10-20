import { useEffect } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { theme, ThemeColors } from '../Theme/Index';
import { useThemedStyles } from '../Theme/ThemeProvider';

type PreviewModalProps = {
  handlePlayPreview: () => void;
  handleStopPreview: () => void;
  previewUri: string | null;
  setPreviewUri: (uri: string | null) => void;
  isPlaying: boolean;
  visible?: boolean;
};

export const PreviewModal = ({
  handlePlayPreview,
  handleStopPreview,
  previewUri,
  setPreviewUri,
  isPlaying,
}: PreviewModalProps) => {
  const styles = useThemedStyles(makeStyles);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isPlaying) {
      scale.value = withRepeat(withTiming(1.05, { duration: 600 }), -1, true);
      return;
    }
    cancelAnimation(scale);
    scale.value = withTiming(1, { duration: 150 });
  }, [isPlaying, scale]);

  const playButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal
      visible={previewUri !== null}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={() => setPreviewUri(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.previewPlayer}>
          <Text style={styles.previewTitle}>Voice Preview</Text>

          <Animated.View style={[styles.previewPlayButton, playButtonStyle]}>
            <Pressable
              style={styles.previewPlayPressable}
              onPress={handlePlayPreview}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Playing' : 'Play preview'}>
              <Text style={styles.previewButtonText}>
                {isPlaying ? 'Playing…' : '▶ Play'}
              </Text>
            </Pressable>
          </Animated.View>

          <Pressable
            style={styles.previewStopButton}
            onPress={handleStopPreview}
            accessibilityRole="button"
            accessibilityLabel="Stop preview">
            <Text style={styles.previewStopText}>■ Stop</Text>
          </Pressable>

          <Pressable style={styles.previewCloseButton} onPress={() => setPreviewUri(null)}>
            <Text style={styles.previewCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  previewPlayer: {
    width: '85%' as const,
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  previewTitle: {
    ...theme.typography.hero,
    fontSize: 24,
    lineHeight: 30,
    color: colors.textDark,
    marginBottom: 20,
  },
  previewPlayButton: {
    width: '100%' as const,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginBottom: 12,
    overflow: 'hidden' as const,
  },
  previewPlayPressable: {
    width: '100%' as const,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  previewButtonText: {
    ...theme.typography.section,
    color: colors.onPrimary,
  },
  previewStopButton: {
    width: '100%' as const,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.pillBg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  previewStopText: {
    ...theme.typography.section,
    color: colors.textDark,
  },
  previewCloseButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  previewCloseText: {
    ...theme.typography.body,
    color: colors.textMuted,
  },
});
