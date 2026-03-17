import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import type { BucketListItem } from '../services/realtimeManager';

/**
 * Filter items to only those that should appear as map pins:
 * uncompleted items with non-null latitude and longitude.
 */
export function filterMapItems(items: BucketListItem[]): BucketListItem[] {
  return items.filter(
    (item) =>
      !item.completed &&
      item.latitude != null &&
      item.longitude != null,
  );
}

interface BucketListMapViewProps {
  items: BucketListItem[];
  onPinPress: (item: BucketListItem) => void;
}

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d1d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8e8e8e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d1d' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2c2c2c' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b6b6b' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e0e0e' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4a4a4a' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }],
  },
];

const INITIAL_REGION = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 90,
  longitudeDelta: 180,
};

export default function BucketListMapView({
  items,
  onPinPress,
}: BucketListMapViewProps) {
  const visibleItems = useMemo(() => filterMapItems(items), [items]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_REGION}
        customMapStyle={DARK_MAP_STYLE}
        accessibilityLabel="Bucket list map"
      >
        {visibleItems.map((item) => (
          <Marker
            key={item.id}
            coordinate={{
              latitude: item.latitude!,
              longitude: item.longitude!,
            }}
            onPress={() => onPinPress(item)}
            accessibilityLabel={item.title}
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerDot} />
              <Text style={styles.markerLabel} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    maxWidth: 120,
  },
  markerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF7F50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FF7F50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  markerLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
