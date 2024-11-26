import * as SecureStore from 'expo-secure-store';
import { useState, useEffect } from 'react';

export function useSecureStorage(key: string) {
  const [value, setValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getValue() {
      try {
        const storedValue = await SecureStore.getItemAsync(key);
        setValue(storedValue);
      } catch (error) {
        console.error(`Error getting ${key}:`, error);
      } finally {
        setIsLoading(false);
      }
    }

    getValue();
  }, [key]);

  const setStoredValue = async (newValue: string | null) => {
    try {
      if (newValue === null) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await SecureStore.setItemAsync(key, newValue);
      }
      setValue(newValue);
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
    }
  };

  return [value, setStoredValue, isLoading] as const;
} 