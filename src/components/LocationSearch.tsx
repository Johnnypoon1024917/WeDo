import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GooglePlacesAutocomplete, GooglePlaceData, GooglePlaceDetail } from 'react-native-google-places-autocomplete';

// Placeholder — replace with your actual Google Places API key from environment/config
const GOOGLE_PLACES_API_KEY = 'YOUR_GOOGLE_PLACES_API_KEY';

export interface LocationResult {
  place_name: string;
  latitude: number;
  longitude: number;
}

interface LocationSearchProps {
  onLocationSelect: (location: LocationResult | null) => void;
}

export default function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const ref = useRef<any>(null);

  const handlePress = (data: GooglePlaceData, detail: GooglePlaceDetail | null) => {
    if (detail?.geometry?.location) {
      onLocationSelect({
        place_name: data.description,
        latitude: detail.geometry.location.lat,
        longitude: detail.geometry.location.lng,
      });
    }
  };

  const handleClear = () => {
    ref.current?.clear();
    onLocationSelect(null);
  };

  return (
    <View style={styles.wrapper}>
      <GooglePlacesAutocomplete
        ref={ref}
        placeholder="Search for a location…"
        onPress={handlePress}
        fetchDetails
        query={{
          key: GOOGLE_PLACES_API_KEY,
          language: 'en',
        }}
        enablePoweredByContainer={false}
        textInputProps={{
          placeholderTextColor: '#6B7280',
          style: styles.textInput,
        }}
        styles={{
          container: styles.autocompleteContainer,
          listView: styles.listView,
          row: styles.row,
          description: styles.description,
          separator: styles.separator,
        }}
        renderRightButton={() => (
          <Pressable
            onPress={handleClear}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear location"
          >
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 1,
  },
  autocompleteContainer: {
    flex: 0,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    paddingRight: 40,
  },
  listView: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginTop: 4,
  },
  row: {
    backgroundColor: '#1E1E1E',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  description: {
    color: '#E5E7EB',
    fontSize: 14,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
});
