import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { spacing, theme, ThemeColors } from '@/Theme/Index';
import { useThemedStyles } from '@/Theme/ThemeProvider';

type Anchor = { x: number; y: number; width: number };

type CustomDropdownProps = {
  label: string;
  value: string;
  options: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
};

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  value,
  options,
  isOpen,
  onToggle,
  onSelect,
}) => {
  const styles = useThemedStyles(makeStyles);
  const fieldRef = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setAnchor(null);
      return;
    }
    const id = requestAnimationFrame(() => {
      fieldRef.current?.measureInWindow((x, y, width, height) => {
        const menuMax = Math.min(220, options.length * 48 + 8);
        const below = y + height + 6;
        const openUp = below + menuMax > windowHeight - 24;
        setAnchor({
          x,
          y: openUp ? Math.max(24, y - menuMax - 6) : below,
          width,
        });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, options.length, windowHeight]);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View ref={fieldRef} collapsable={false}>
        <Pressable
          style={[styles.field, isOpen && styles.fieldOpen]}
          onPress={onToggle}
          accessibilityRole="combobox"
          accessibilityState={{ expanded: isOpen }}>
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
          <Text style={styles.chevron}>{isOpen ? '⌃' : '⌄'}</Text>
        </Pressable>
      </View>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onToggle}>
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={onToggle} />
          {anchor ? (
            <View
              style={[
                styles.menuWrap,
                { top: anchor.y, left: anchor.x, width: anchor.width },
              ]}>
              <View style={styles.menu}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  style={styles.menuScroll}
                  bounces={false}
                  nestedScrollEnabled>
                  {options.map((option) => {
                    const selected = option === value;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.option, selected && styles.optionSelected]}
                        onPress={() => onSelect(option)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}>
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) => ({
  group: { width: '100%' as const },
  label: {
    ...theme.typography.section,
    color: colors.textDark,
    marginBottom: 8,
  },
  field: {
    minHeight: 52,
    borderColor: colors.borderLight,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: colors.cardBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  fieldOpen: { borderColor: colors.primary },
  value: {
    ...theme.typography.body,
    color: colors.textDark,
    flex: 1,
    paddingRight: 8,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    lineHeight: 18,
    marginTop: -5,
  },
  modalRoot: { flex: 1 },
  menuWrap: { position: 'absolute' as const },
  menu: {
    borderColor: colors.borderLight,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: colors.cardBg,
    overflow: 'hidden' as const,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  menuScroll: { maxHeight: 220 },
  option: {
    minHeight: 48,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.md,
  },
  optionSelected: { backgroundColor: colors.purpleLightBg },
  optionText: { ...theme.typography.body, color: colors.textDark },
  optionTextSelected: { color: colors.primary, fontWeight: '600' as const },
});
