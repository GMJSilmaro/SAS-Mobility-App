import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Alert, Animated, Platform, KeyboardAvoidingView, Image, SafeAreaView, Dimensions, TouchableOpacity } from 'react-native';
import { ThemedText } from '../../src/components/ThemedText';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AnimatedInput } from '../../src/components/AnimatedInput';
import { LoadingButton } from '../../src/components/common/LoadingButton';
import { useAuth } from '../../src/hooks/useAuth';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import * as SecureStore from 'expo-secure-store';
import { LoadingOverlay } from '@/src/components/LoadingOverlay';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, authLoading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const saveCredentialsLocally = async (userData: any) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify({
        email,
        workerId: userData.workerId,
        lastLoginTime: new Date().toISOString(),
        // Add other necessary user data
      }));
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  const handleLogin = async () => {
    if (loading) return;
    
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please enter both email and password',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const networkState = await NetInfo.fetch();
      
      if (!networkState.isConnected) {
        // Offline login
        const savedUserData = await AsyncStorage.getItem('userData');
        if (savedUserData) {
          const userData = JSON.parse(savedUserData);
          if (userData.email === email) {
            // Implement offline authentication logic here
            await SecureStore.setItemAsync('workerId', userData.workerId);
            Toast.show({
              type: 'success',
              text1: 'Offline Login Successful',
              text2: 'You are working in offline mode',
              position: 'top',
              visibilityTime: 2000,
            });
            return;
          }
        }
        throw new Error('Offline login failed');
      }

      // Online login
      const userCredential = await signIn(email, password);
      
      if (userCredential?.user?.uid) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', '==', userCredential.user.uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          await saveCredentialsLocally(userData);
          await SecureStore.setItemAsync('workerId', userData.workerId);
          
          if (networkState.isConnected) {
            const userRef = doc(db, 'users', userData.workerId);
            await updateDoc(userRef, {
              isOnline: true,
              lastSeen: new Date(),
            });
          }
        }
      }

      Toast.show({
        type: 'success',
        text1: 'Welcome back! 👋',
        text2: 'Successfully logged in to your account',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error: any) {
      let errorMessage = 'Please check your credentials and try again';
      
      if (error?.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection';
      } else if (error?.message?.includes('invalid')) {
        errorMessage = 'Invalid email or password';
      } else if (error?.message?.includes('many')) {
        errorMessage = 'Too many attempts. Please try again later';
      }

      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: errorMessage,
        position: 'top',
        visibilityTime: 3000,
      });
      
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isButtonEnabled = email.length > 0 && password.length > 0;

  if (loading) {
    return <LoadingOverlay message="Initializing app, please wait..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/SAS-LOGO.png')}
              style={[styles.logo, { width: width * 0.8, height: 180 }]} 
              resizeMode="contain"
            />
            <ThemedText style={styles.subtitle}>Streamline Your Field Service Operations</ThemedText>
            <ThemedText style={styles.welcomeText}>Log In</ThemedText>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <AnimatedInput
                icon="email-outline"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              
              <AnimatedInput
                icon="lock-outline"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                isPassword
              />
            </View>

            <LoadingButton 
              onPress={handleLogin}
              disabled={!isButtonEnabled}
              isLoading={loading}
            >
              <ThemedText style={styles.buttonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </ThemedText>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
            </LoadingButton>

            <TouchableOpacity>
              <ThemedText style={styles.forgotPassword}>
                Forgot Password?
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                Need technical support?{' '}
                <ThemedText style={styles.footerLink}>Contact IT</ThemedText>
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
      {authLoading && (
        <LoadingOverlay 
          message="Signing in to your account, please wait..."
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
      },
      keyboardView: {
        flex: 1,
      },
      content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
      },
      logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
      },
      logo: {
        width: 200,
        height: 80,
        marginBottom: 16,
      },
      subtitle: {
        fontSize: 18,
        color: '#666',
        fontWeight: '500',
        marginBottom: 8,
      },
      welcomeText: {
        fontSize: 24,
        color: '#333',
        fontWeight: '700',
        marginTop: 16,
      },
      formContainer: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
      },
      inputContainer: {
        marginBottom: 24,
      },
      buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
      },
      forgotPassword: {
        textAlign: 'center',
        marginTop: 16,
        color: '#009DC4',
        fontSize: 14,
        fontWeight: '500',
      },
      footer: {
        marginTop: 48,
        alignItems: 'center',
      },
      footerText: {
        fontSize: 14,
        color: '#666',
      },
      footerLink: {
        color: '#009DC4',
        fontWeight: '500',
      },
}); 