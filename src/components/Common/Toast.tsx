import React from 'react';
import { Text, View } from 'react-native';
import ToastMessage from 'react-native-toast-message';
import { theme, ThemeColors } from '../../Theme/Index';
import { useThemedStyles } from '../../Theme/ThemeProvider';

/** `success`: green text and border, `error`: red text and border, `info`: neutral. */
export type ToastVariant = 'success' | 'error' | 'info';

export const showToast = (message: string, variant: ToastVariant = 'info') => {
  ToastMessage.show({
    type: 'narrator',
    text1: message,
    props: { variant },
    visibilityTime: 2400,
    position: 'bottom',
    bottomOffset: 85,
  });
};

const NarratorToast = ({ text1, variant = 'info' }: { text1?: string; variant?: ToastVariant }) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={[
        styles.toast,
        variant === 'success' && styles.successBorder,
        variant === 'error' && styles.errorBorder,
      ]}>
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

export const Toast = () => (
  <ToastMessage
    config={{
      narrator: ({ text1, props }) => <NarratorToast text1={text1} variant={props?.variant} />,
    }}
  />
);

const makeStyles = (colors: ThemeColors) => ({
  toast: {
    backgroundColor: colors.toastBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: '90%' as const,
    borderWidth: 1,
    borderColor: colors.borderLight,
    // Lifts the light toast off the light background.
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  successBorder: { borderColor: colors.success },
  errorBorder: { borderColor: colors.danger },
  toastText: {
    ...theme.typography.body,
    color: colors.toastText,
  },
  successText: { color: colors.success },
  errorText: { color: colors.danger },
});
