import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

/** Pro demonstration video: muted, looping, filling its tile. It plays only while its screen is focused and
 *  the app is in the foreground, and its poster (the clip's first frame) covers the view until the first
 *  frame renders, so the tile never flashes black. Remount it (`key`) to change the clip. */
export function ProVideo({ source, poster }: { source: number; poster: number }) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    // A silent demo must never pause the user's music or duck the coach voice.
    p.audioMixingMode = 'mixWithOthers';
  });
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => setForeground(st === 'active'));
    return () => sub.remove();
  }, []);

  const active = focused && foreground;
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  return (
    // No touches on the video, so the tile's own press handlers (e.g. "About this exercise") keep working.
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {/* textureView: a SurfaceView ignores the tile's rounded clip and the screens' fade/slide animations on Android. */}
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} surfaceType="textureView" onFirstFrameRender={() => setRendered(true)} />
      {!rendered && <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" />}
    </View>
  );
}
