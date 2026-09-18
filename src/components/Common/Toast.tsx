import React from 'react';
import { Text, View } from 'react-native';
import ToastMessage, { BaseToastProps } from 'react-native-toast-message';
import { theme, ThemeColors } from '../../Theme/Index';
import { useThemedStyles } from '../../Theme/ThemeProvider';

export const showToast = (message: string) => {
  ToastMessage.show({
    type: 'narrator',
    text1: message,
    visibilityTime: 2400,
    position: 'bottom',
    bottomOffset: 85,
  });
};

const NarratorToast = ({ text1 }: BaseToastProps) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{text1}</Text>
    </View>
  );
};

export const Toast = () => (
  <ToastMessage
    config={{
      narrator: (props) => <NarratorToast {...props} />,
    }}
  />
);

const makeStyles = (colors: ThemeColors) => ({
  toast: {
    backgroundColor: colors.textDark,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: '90%' as const,
  },
  toastText: {
    ...theme.typography.body,
    color: colors.background,
  },
});
