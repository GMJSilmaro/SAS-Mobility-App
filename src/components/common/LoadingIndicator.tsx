import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View, Animated, Easing } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface LoadingIndicatorProps {
  message?: string;
  color?: string;
  size?: 'small' | 'large';
}

export const LoadingIndicator = ({ 
  message = 'Loading...', 
  color = '#009DC4',
  size = 'large'
}: LoadingIndicatorProps) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();

    // Spin animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();

    // Dots animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotsAnim, {
          toValue: 3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(dotsAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dots = dotsAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: ['', '.', '..', '...'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.loadingContent}>
        <Animated.View style={[
          styles.iconContainer,
          {
            transform: [
              { scale: pulseAnim },
              { rotate: spin }
            ]
          }
        ]}>
          <MaterialCommunityIcons 
            name="loading" 
            size={size === 'large' ? 40 : 24} 
            color={color} 
          />
        </Animated.View>
        
        {message && (
          <View style={styles.messageContainer}>
            <ThemedText style={styles.message}>
              {message}
              <Animated.Text style={styles.dots}>
                {dots}
              </Animated.Text>
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 999,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  dots: {
    fontSize: 16,
    color: '#666',
    marginLeft: 2,
  }
}); 