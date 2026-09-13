import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/lib/theme';

type Props = {
  value: string | null;
  onChange: (uri: string) => void;
};

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function acceptAsset(asset: ImagePicker.ImagePickerAsset, onChange: (uri: string) => void) {
  if (asset.mimeType && !asset.mimeType.startsWith('image/')) {
    Alert.alert('Not an image', 'Pick a photo file (JPEG or PNG).');
    return;
  }
  if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) {
    Alert.alert('Photo too large', 'Pick a photo under 10 MB.');
    return;
  }
  onChange(asset.uri);
}

export function PhotoCapture({ value, onChange }: Props) {
  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Allow camera access to photograph the produce.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) acceptAsset(result.assets[0], onChange);
  }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission required', 'Allow photo access to select a produce image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) acceptAsset(result.assets[0], onChange);
  }

  return (
    <View>
      {value ? (
        <Image source={{ uri: value }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.camera}>◉</Text>
          <Text style={styles.placeholderTitle}>Add a produce photo</Text>
          <Text style={styles.placeholderText}>Good light · one crate or sample · no filters</Text>
        </View>
      )}
      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Take photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={choosePhoto}>
          <Text style={styles.buttonText}>Choose photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 215,
    borderRadius: 18,
  },
  placeholder: {
    height: 185,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.line,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 18,
  },
  camera: {
    color: colors.primary,
    fontSize: 28,
    marginBottom: 8,
  },
  placeholderTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  placeholderText: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 5,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 11,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 13,
    paddingVertical: 13,
  },
  buttonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
});
