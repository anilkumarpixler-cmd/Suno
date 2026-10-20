import { Modal, Pressable, Text, View } from 'react-native';
import { theme, ThemeColors } from '../Theme/Index';
import { useThemedStyles } from '../Theme/ThemeProvider';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ConfirmModal = ({
  visible,
  title,
  message,
  cancelLabel = 'Cancel',
  confirmLabel = 'Delete',
  onCancel,
  onConfirm,
}: ConfirmModalProps) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable style={styles.confirmCard} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmBody}>{message}</Text>
          <View style={styles.confirmRow}>
            <Pressable
              style={styles.confirmCancel}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}>
              <Text style={styles.confirmCancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={styles.confirmDelete}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}>
              <Text style={styles.confirmDeleteText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 24,
  },
  confirmCard: {
    width: '85%' as const,
    backgroundColor: colors.cardBg,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 22,
  },
  confirmTitle: { ...theme.typography.cardTitle, color: colors.textDark, marginBottom: 8 },
  confirmBody: { ...theme.typography.body, color: colors.textMuted, marginBottom: 20 },
  confirmRow: { flexDirection: 'row' as const, gap: 10 },
  confirmCancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  confirmCancelText: { ...theme.typography.section, color: colors.textDark },
  confirmDelete: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  confirmDeleteText: { ...theme.typography.section, color: colors.onPrimary },
});
