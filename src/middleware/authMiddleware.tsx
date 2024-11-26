import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSegments, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export function useProtectedRoute() {
  const { isAuthenticated, loading, workerId, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (loading || !isInitialized) return;

      const inAuthGroup = segments[0] === '(auth)';
      const savedUserData = await AsyncStorage.getItem('userData');

      if (!isAuthenticated && !inAuthGroup) {
        if (isOffline && savedUserData) {
          // Allow access if offline and has saved credentials
          const userData = JSON.parse(savedUserData);
          router.replace({
            pathname: '/(tabs)/home',
            params: { workerId: userData.workerId }
          });
        } else {
          router.replace('/(auth)/login');
        }
      } else if (isAuthenticated && inAuthGroup && workerId) {
        router.replace({
          pathname: '/(tabs)/home',
          params: { workerId }
        });
      }
    };

    checkAuth();
  }, [isAuthenticated, segments, loading, workerId, isInitialized, isOffline]);
} 