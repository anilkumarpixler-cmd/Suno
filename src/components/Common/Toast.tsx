import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ToastMessage from 'react-native-toast-message';
import { theme, ThemeColors } from '../../Theme/Index';
import { useThemedStyles } from '../../Theme/ThemeProvider';

/** `success`: green text, `error`: red text, `info`: neutral. All share the same border. */
export type ToastVariant = 'success' | 'error' | 'info';

export type ToastOptions = {
  /** Bottom sits above the tab bar; top sits below the status bar. */
  position?: 'top' | 'bottom';
  durationMs?: number;
  /** Shown before the message, e.g. the sleep mode moon. */
  icon?: ToastIcon;
};

export type ToastIcon = 'moon';

// Same yellow as the sleep mode icon on the Sleep timer and Profile pages.
const ICONS: Record<ToastIcon, { name: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  moon: { name: 'bedtime', color: '#F5C84B' },
};

// Distance of bottom toasts from the screen's bottom edge. The root layout keeps it just above
// whatever is down there (tab bar, mini player, the phone's nav bar).
let bottomToastOffset = 85;

export const setBottomToastOffset = (px: number) => {
  bottomToastOffset = px;
};

export const showToast = (
  message: string,
  variant: ToastVariant = 'info',
  { position = 'bottom', durationMs = 2400, icon }: ToastOptions = {},
) => {
  ToastMessage.show({
    type: 'narrator',
    text1: message,
    props: { variant, icon },
    visibilityTime: durationMs,
    position,
    bottomOffset: bottomToastOffset,
  });
};

type NarratorToastProps = { text1?: string; variant?: ToastVariant; icon?: ToastIcon };

const NarratorToast = ({ text1, variant = 'info', icon }: NarratorToastProps) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.toast}>
      {icon && <MaterialIcons name={ICONS[icon].name} size={22} color={ICONS[icon].color} />}
      <Text
        style={[
          styles.toastText,
          variant === 'success' && styles.successText,
          variant === 'error' && styles.errorText,
        ]}>
        {text1}
      </Text>
    </View>
  );
};

export const Toast = () => {
  const insets = useSafeAreaInsets();
  return (
    <ToastMessage
      topOffset={insets.top + 12}
      config={{
        narrator: ({ text1, props }) => (
          <NarratorToast text1={text1} variant={props?.variant} icon={props?.icon} />
        ),
      }}
    />
  );
};

const makeStyles = (colors: ThemeColors) => ({
  toast: {
    backgroundColor: colors.toastBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: '90%' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    // Lifts the light toast off the light background.
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toastText: {
    ...theme.typography.body,
    fontWeight: '700' as const,
    color: colors.toastText,
    // Wraps beside the icon instead of pushing past the toast's max width.
    flexShrink: 1,
  },
  successText: { color: colors.success },
  errorText: { color: colors.danger },
});
