import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';
import { theme } from '../Theme/Index';


export const PreviewModal=({handlePlayPreview,handleStopPreview,previewUri,setPreviewUri}:any)=>{
    // const [previewUri, setPreviewUri] = useState<string | null>(null);
    return(
        <Modal
  visible={previewUri !== null}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setPreviewUri(null)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.previewPlayer}>
      <Text style={styles.previewTitle}>
        Voice Preview
      </Text>

      <Pressable
        style={styles.previewPlayButton}
        onPress={handlePlayPreview}
      >
        <Text style={styles.previewButtonText}>
          ▶ Play
        </Text>
      </Pressable>

      <Pressable
        style={styles.previewStopButton}
        onPress={handleStopPreview}
      >
        <Text style={styles.previewStopText}>
          ■ Stop
        </Text>
      </Pressable>

      <Pressable
        style={styles.previewCloseButton}
        onPress={() => setPreviewUri(null)}
      >
        <Text style={styles.previewCloseText}>
          Close
        </Text>
      </Pressable>
    </View>
  </View>
</Modal>
    )
}

const styles=StyleSheet.create({
    modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},

previewPlayer: {
  width: '85%',
  backgroundColor: '#fff',
  borderRadius: 20,
  padding: 24,
  alignItems: 'center',

  // Shadow for iOS
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.25,
  shadowRadius: 8,

  // Shadow for Android
  elevation: 8,
},

previewTitle: {
  ...theme.typography.hero,
  fontSize: 24,
  lineHeight: 30,
  marginBottom: 20,
},

previewPlayButton: {
  width: '100%',
  paddingVertical: 14,
  borderRadius: 12,
  backgroundColor: '#000',
  alignItems: 'center',
  marginBottom: 12,
},

previewButtonText: {
  ...theme.typography.section,
  color: '#fff',
},

previewStopButton: {
  width: '100%',
  paddingVertical: 14,
  borderRadius: 12,
  backgroundColor: '#eee',
  alignItems: 'center',
  marginBottom: 12,
},

previewStopText: {
  ...theme.typography.section,
  color: '#000',
},

previewCloseButton: {
  paddingVertical: 10,
  paddingHorizontal: 20,
},

previewCloseText: {
  ...theme.typography.body,
  color: '#666',
},
})