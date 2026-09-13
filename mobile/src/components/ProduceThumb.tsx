import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';
import { Harvest } from '@/lib/types';

/**
 * Produce tile for marketplace rows: the seller's photo when it passed the
 * photo check, otherwise a flat crop-letter tile. Never a fake image.
 */
export function ProduceThumb({ harvest, size = 42 }: { harvest: Harvest; size?: number }) {
  const box = { width: size, height: size, borderRadius: Math.round(size * 0.19) };
  if (harvest.imageUri && harvest.assessment.photoStatus === 'Accepted') {
    return <Image source={{ uri: harvest.imageUri }} style={box} />;
  }
  return (
    <View style={[styles.tile, box]}>
      <Text style={[styles.letter, { fontSize: Math.round(size * 0.42) }]}>
        {harvest.crop.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#F0E6D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { color: colors.primaryDark, fontWeight: '700' },
});
