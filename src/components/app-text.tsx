import {
  Text as NativeText,
  StyleSheet,
  type TextProps,
  type TextStyle,
} from 'react-native';

export type TextVariant =
  | 'display'
  | 'title'
  | 'body'
  | 'bodyMedium'
  | 'caption'
  | 'button';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
};

const FONT_BY_WEIGHT: Record<string, string> = {
  '400': 'Mulish_400Regular',
  '500': 'Mulish_500Medium',
  '600': 'Mulish_600SemiBold',
  '700': 'Mulish_700Bold',
  '800': 'Mulish_800ExtraBold',
  normal: 'Mulish_400Regular',
  bold: 'Mulish_700Bold',
};

export function Text({ style, variant = 'body', ...props }: AppTextProps) {
  const flattenedStyle = StyleSheet.flatten([styles[variant], style]) as TextStyle;
  const fontFamily = flattenedStyle?.fontWeight
    ? FONT_BY_WEIGHT[String(flattenedStyle.fontWeight)]
    : 'Mulish_400Regular';

  return <NativeText {...props} style={[styles[variant], style, { fontFamily }]} />;
}

const styles = StyleSheet.create<Record<TextVariant, TextStyle>>({
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  button: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
