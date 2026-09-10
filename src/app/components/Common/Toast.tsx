import React from 'react';
import { StyleSheet, View } from 'react-native';
import ToastMessage from 'react-native-toast-message';
import { theme } from '../../Theme/Index';
import { Text } from './Text';

export const showToast = (message: string) => {
	ToastMessage.show({
		type: 'narrator',
		text1: message,
		visibilityTime: 2400,
		position: 'bottom',
		bottomOffset: 85,
	});
};

export const Toast: React.FC = () => (
	<ToastMessage
		config={{
			narrator: ({ text1 }) => (
				<View style={styles.container}>
					<Text style={styles.message}>{text1}</Text>
				</View>
			),
		}}
	/>
);

const styles = StyleSheet.create({
	container: {
		minHeight: 52,
		maxWidth: '100%',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 16,
		backgroundColor: theme.colors.textDark,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		shadowColor: '#000000',
		shadowOpacity: 0.16,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
		
	},
	message: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', flexShrink: 1 },
});
