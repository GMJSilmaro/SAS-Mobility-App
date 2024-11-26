import { useState, useEffect } from 'react';
import { User, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useSecureStorage } from './useSecureStorage';
import { useWorkerStatus } from './useWorkerStatus';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [workerId, setWorkerId] = useSecureStorage('workerId');
  const [isInitialized, setIsInitialized] = useState(false);

  useWorkerStatus(workerId);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          setUser(user);
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('uid', '==', user.uid));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            const foundWorkerId = userData.workerId;
            
            if (foundWorkerId) {
              await setWorkerId(foundWorkerId);
            }
          }
          
          await AsyncStorage.setItem('offlineUser', JSON.stringify(user));
        } else {
          setUser(null);
          await setWorkerId(null);
          await AsyncStorage.removeItem('offlineUser');
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', userCredential.user.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const foundWorkerId = userData.workerId;
        
        if (foundWorkerId) {
          await setWorkerId(foundWorkerId);
          // Don't navigate here - let the authMiddleware handle it
        }
      }

      return userCredential;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const SignOut = async () => {
    setAuthLoading(true);
    console.log('🔴 [useAuth.ts] Signing out');
    try {
      if (workerId) {
        const workerRef = doc(db, 'users', workerId);
        try {
          await updateDoc(workerRef, {
            isOnline: false,
            lastSeen: new Date(),
          });
        } catch (error) {
          console.error('🔴 [useAuth.ts] Error updating offline status on sign out:', error);
        }
      }

      router.replace('/(auth)/login');
      await auth.signOut();
      
      await Promise.all([
        SecureStore.deleteItemAsync('workerId'),
        AsyncStorage.removeItem('offlineAuth'),
        AsyncStorage.removeItem('offlineCredentials'),
        AsyncStorage.removeItem('offlineUser')
      ]);

      setWorkerId(null);
      setUser(null);
      
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  return {
    user,
    loading,
    authLoading,
    isInitialized,
    signIn,
    SignOut,
    isAuthenticated: !!user,
    workerId,
    setWorkerId,
  };
} 