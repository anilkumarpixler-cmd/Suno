import {
  View,
  Text,
  Pressable,
  Modal,
} from 'react-native';
import { theme, ThemeColors } from '../Theme/Index';
import { useThemedStyles } from '../Theme/ThemeProvider';

type PreviewModalProps = {
  handlePlayPreview: () => void;
  handleStopPreview: () => void;
  previewUri: string | null;
  setPreviewUri: (uri: string | null) => void;
  visible?: boolean;
};

export const PreviewModal = ({
  handlePlayPreview,
  handleStopPreview,
  previewUri,
  setPreviewUri,
}: PreviewModalProps) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal
      visible={previewUri !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setPreviewUri(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.previewPlayer}>
          <Text style={styles.previewTitle}>Voice Preview</Text>

          <Pressable style={styles.previewPlayButton} onPress={handlePlayPreview}>
            <Text style={styles.previewButtonText}>▶ Play</Text>
          </Pressable>

          <Pressable style={styles.previewStopButton} onPress={handleStopPreview}>
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
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.textDark,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  previewButtonText: {
    ...theme.typography.section,
    color: colors.background,
  },
  previewStopButton: {
    width: '100%' as const,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.pillBg,
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
