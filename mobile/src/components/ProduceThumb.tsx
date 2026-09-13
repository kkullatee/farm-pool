import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { Harvest } from '@/lib/types';

const ORANGE = '#E8A33D';
const ORANGE_LIGHT = '#F0BC66';
const RED = '#C9573B';
const RED_LIGHT = '#DE7A5E';
const YELLOW = '#EFC94C';
const PURPLE = '#8A6FA8';
const GREEN = '#4C8A46';
const GREEN_LIGHT = '#6BA05C';
const TILE = '#F0E6D2';

/** Flat hand-drawn-style produce art, one 40x40 drawing per crop family. */
function CropArt({ crop }: { crop: string }) {
  if (/apple|tomato|peach|nectarine|plum|cherry/i.test(crop)) {
    return (
      <>
        <Circle cx={20} cy={23} r={11} fill={RED} />
        <Ellipse cx={16} cy={20} rx={4} ry={3} fill={RED_LIGHT} />
        <Path d="M20 12 Q20 8 23 6" stroke={GREEN} strokeWidth={2} fill="none" />
        <Path d="M21 10 Q26 5 30 8 Q26 11 23 12 Z" fill={GREEN} />
      </>
    );
  }
  if (/berr|grape/i.test(crop)) {
    return (
      <>
        <Circle cx={14} cy={20} r={6} fill={PURPLE} />
        <Circle cx={26} cy={20} r={6} fill={PURPLE} />
        <Circle cx={20} cy={28} r={6} fill={PURPLE} />
        <Ellipse cx={12} cy={18} rx={2} ry={1.5} fill="#A98FC4" />
        <Path d="M20 14 Q24 8 29 10 Q24 13 22 15 Z" fill={GREEN} />
      </>
    );
  }
  if (/carrot|potato|beet|radish|onion|garlic|root/i.test(crop)) {
    return (
      <>
        <Path d="M17 14 Q20 12 23 14 L21 32 Q20 34 19 32 Z" fill={ORANGE} />
        <Path d="M18 13 Q14 8 12 9 Q15 12 17 14 Z" fill={GREEN} />
        <Path d="M20 13 Q20 6 22 5 Q22 10 21 13 Z" fill={GREEN_LIGHT} />
        <Path d="M22 13 Q26 8 28 9 Q25 12 23 14 Z" fill={GREEN} />
      </>
    );
  }
  if (/corn|maize|wheat|barley|grain|rice|oat/i.test(crop)) {
    return (
      <>
        <Ellipse cx={20} cy={22} rx={7} ry={12} fill={YELLOW} />
        <Path d="M13 22 Q8 26 9 32 Q14 30 15 26 Z" fill={GREEN} />
        <Path d="M27 22 Q32 26 31 32 Q26 30 25 26 Z" fill={GREEN} />
        <Ellipse cx={17} cy={18} rx={2} ry={4} fill="#F6DE85" />
      </>
    );
  }
  if (/lettuce|spinach|kale|cabbage|herb|basil|greens|leaf/i.test(crop)) {
    return (
      <>
        <Path d="M20 33 Q8 28 10 14 Q20 18 20 33 Z" fill={GREEN} />
        <Path d="M20 33 Q32 28 30 14 Q20 18 20 33 Z" fill={GREEN_LIGHT} />
        <Path d="M20 32 Q20 20 20 10" stroke="#3A6E36" strokeWidth={1.5} fill="none" />
      </>
    );
  }
  if (/banana/i.test(crop)) {
    return (
      <>
        <Path d="M11 14 Q13 30 29 30 Q31 27 28 26 Q17 25 15 13 Q12 11 11 14 Z" fill={YELLOW} />
        <Path d="M28 26 Q31 27 29 30" stroke="#C9A32E" strokeWidth={1.5} fill="none" />
      </>
    );
  }
  // Mango, citrus, melon and the general fruit fallback: the mockup mango.
  return (
    <>
      <Ellipse cx={20} cy={23} rx={12} ry={10} fill={ORANGE} />
      <Ellipse cx={16} cy={20} rx={5} ry={4} fill={ORANGE_LIGHT} />
      <Path d="M20 13 Q25 7 30 10 Q25 12 22 14 Z" fill={GREEN} />
    </>
  );
}

/**
 * Produce tile for marketplace rows: the seller's photo when it passed the
 * photo check, otherwise flat crop art. Never a fake photo.
 */
export function ProduceThumb({ harvest, size = 42 }: { harvest: Harvest; size?: number }) {
  const box = { width: size, height: size, borderRadius: Math.round(size * 0.19) };
  if (harvest.imageUri && harvest.assessment.photoStatus === 'Accepted') {
    return <Image source={{ uri: harvest.imageUri }} style={box} />;
  }
  return (
    <View style={[styles.tile, box]}>
      <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 40 40">
        <CropArt crop={harvest.crop} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: TILE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
