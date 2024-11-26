import React, { useCallback, useRef, useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getDirections } from '@/src/utils/mapUtils';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigateScreenProps = {
  job: any;
  currentLocation: any;
};

const NavigateScreen: React.FC<NavigateScreenProps> = ({ job, currentLocation: initialLocation }) => {
  const mapRef = useRef<MapView>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState(initialLocation);
  const locationSubscription = useRef<any>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [cachedRoute, setCachedRoute] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Load cached route if offline
  useEffect(() => {
    const loadCachedRoute = async () => {
      try {
        const cached = await AsyncStorage.getItem(`route_${job.jobID}`);
        if (cached) {
          setCachedRoute(JSON.parse(cached));
        }
      } catch (error) {
        console.error('Error loading cached route:', error);
      }
    };

    if (isOffline) {
      loadCachedRoute();
    }
  }, [isOffline, job.jobID]);

  // Start location tracking
  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Location permission denied');
        return;
      }

      // Start watching position with high accuracy
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000, // Update every 3 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        async (location) => {
          setCurrentLocation(location);
          
          // Update route when location changes significantly
          if (job?.location?.coordinates) {
            const newRoute = await getDirections(
              {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
              },
              {
                latitude: job.location.coordinates.latitude,
                longitude: job.location.coordinates.longitude
              }
            );
            
            if (newRoute) {
              setRouteCoordinates(newRoute.coordinates);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  // Initial directions request
  const handleDirectionsPress = useCallback(async () => {
    if (!currentLocation?.coords || !job?.location?.coordinates) {
      return;
    }

    try {
      if (isOffline && cachedRoute) {
        // Use cached route if offline
        setRouteCoordinates(cachedRoute.coordinates);
        mapRef.current?.fitToCoordinates(cachedRoute.coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true
        });
      } else if (!isOffline) {
        // Online flow
        const result = await getDirections(
          {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude
          },
          {
            latitude: job.location.coordinates.latitude,
            longitude: job.location.coordinates.longitude
          }
        );

        if (result) {
          setRouteCoordinates(result.coordinates);
          // Cache the route
          await AsyncStorage.setItem(`route_${job.jobID}`, JSON.stringify(result));
          // Fit map to show the entire route
          mapRef.current?.fitToCoordinates(result.coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true
          });

          // Start tracking location after getting initial directions
          startLocationTracking();
        }
      } else {
        Alert.alert('Offline', 'No cached route available. Please try when online.');
      }
    } catch (error) {
      console.error('Error getting directions:', error);
    }
  }, [currentLocation, job, isOffline, cachedRoute]);

  // Cleanup location subscription
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <MapView 
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: job?.location?.coordinates?.latitude ?? 1.3521,
          longitude: job?.location?.coordinates?.longitude ?? 103.8198,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation
        followsUserLocation
      >
        {/* Destination Marker */}
        {job?.location?.coordinates && (
          <Marker
            coordinate={{
              latitude: job.location.coordinates.latitude,
              longitude: job.location.coordinates.longitude,
            }}
            title={job.location.locationName}
            pinColor="red"
          />
        )}

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={3}
            strokeColor="#009DC4"
          />
        )}
      </MapView>

      {/* Get Directions Button */}
      <TouchableOpacity 
        style={styles.directionButton}
        onPress={handleDirectionsPress}
      >
        <MaterialCommunityIcons name="directions" size={24} color="white" />
        <ThemedText style={styles.directionButtonText}>Get Directions</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  directionButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#009DC4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  directionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NavigateScreen;