import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useEffect } from 'react';
import { AppState } from 'react-native';

export function useWorkerStatus(workerId: string | null) {
  useEffect(() => {
    if (!workerId) return;

    const handleAppStateChange = async (nextAppState: string) => {
      const workerRef = doc(db, 'users', workerId);

      try {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          await updateDoc(workerRef, {
            isOnline: false,
            lastSeen: new Date(),
          });
        } else if (nextAppState === 'active') {
          await updateDoc(workerRef, {
            isOnline: true,
          });
        }
      } catch (error) {
        console.error('🔴 [useWorkerStatus.ts] Error updating worker status:', error);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set initial online status
    const setInitialStatus = async () => {
      try {
        const workerRef = doc(db, 'users', workerId);
        await updateDoc(workerRef, {
          isOnline: true,
        });
      } catch (error) {
        console.error('🔴 [useWorkerStatus.ts] Error setting initial status:', error);
      }
    };
    setInitialStatus();

    return () => {
      subscription.remove();
    };
  }, [workerId]);
} 