import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

/** Indian tricolour drawn as SVG — the 🇮🇳 emoji renders as "?" boxes under custom fonts. */
export function IndiaFlag({ width = 24 }: { width?: number }) {
  const height = (width * 2) / 3;
  return (
    <View style={[s.wrap, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 30 20">
        <Rect x={0} y={0} width={30} height={6.67} fill="#FF9933" />
        <Rect x={0} y={6.67} width={30} height={6.67} fill="#FFFFFF" />
        <Rect x={0} y={13.33} width={30} height={6.67} fill="#138808" />
        <Circle cx={15} cy={10} r={2.6} fill="none" stroke="#000080" strokeWidth={0.8} />
        <Circle cx={15} cy={10} r={0.7} fill="#000080" />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { borderRadius: 3, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.12)' },
});
