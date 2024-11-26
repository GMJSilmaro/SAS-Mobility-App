import { SplashScreen, Stack } from 'expo-router';
import { useProtectedRoute } from '../src/middleware/authMiddleware';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import '@expo/metro-runtime';

export const unstable_settings = {
  initialRouteName: "home",
};

export default function RootLayout() {
  useProtectedRoute();

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack 
        screenOptions={{ 
          headerShown: false,
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
