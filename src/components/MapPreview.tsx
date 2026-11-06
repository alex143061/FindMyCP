import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { LocationRecord } from '@/types/location';
import { useAppTheme } from '@/lib/theme';

export function MapPreview({
  location,
  route = [],
  height = 220,
}: {
  location: LocationRecord | null;
  route?: LocationRecord[];
  height?: number;
}) {
  const colors = useAppTheme();
  const mapKeyAvailable = Boolean(
    Constants.expoConfig?.android?.config?.googleMaps,
  );
  const mapAvailable = Platform.OS === 'ios' || mapKeyAvailable;
  const coordinate = useMemo(
    () =>
      location
        ? { latitude: location.latitude, longitude: location.longitude }
        : null,
    [location],
  );

  if (!mapAvailable || !coordinate) {
    return (
      <View
        style={[
          styles.placeholder,
          { height, backgroundColor: colors.map, borderColor: colors.border },
        ]}
      >
        <View style={styles.grid} />
        <View style={[styles.pin, { backgroundColor: colors.accent }]}>
          <Text style={styles.pinText}>{coordinate ? '●' : '+'}</Text>
        </View>
        <Text style={[styles.mapCaption, { color: colors.muted }]}>
          {!coordinate
            ? 'Your map will appear after the first GPS fix'
            : 'Add an Android Maps key to display map tiles'}
        </Text>
      </View>
    );
  }

  return (
    <MapView
      style={{ height, borderRadius: 16 }}
      initialRegion={{
        ...coordinate,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      region={{
        ...coordinate,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass
      loadingEnabled
    >
      <Marker coordinate={coordinate} title="Last recorded location" />
      {route.length > 1 ? (
        <Polyline
          coordinates={route.map((item) => ({
            latitude: item.latitude,
            longitude: item.longitude,
          }))}
          strokeColor={colors.accent}
          strokeWidth={4}
        />
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.35,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#78948A',
    transform: [{ rotate: '-12deg' }, { scale: 1.4 }],
  },
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  mapCaption: {
    position: 'absolute',
    bottom: 14,
    paddingHorizontal: 12,
    fontSize: 12,
  },
});
