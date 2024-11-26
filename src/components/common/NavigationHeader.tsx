import { router } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';

interface NavigationHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function NavigationHeader({ 
  title, 
  showBackButton = true,
  onBack 
}: NavigationHeaderProps) {
  const scaleAnim = new Animated.Value(1);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4
    }).start();
  };

  return (
    <View style={styles.container}>
      {showBackButton && (
        <TouchableOpacity 
          onPress={handleBack}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.9}
          pressRetentionOffset={{ top: 20, left: 20, bottom: 20, right: 20 }}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <MaterialCommunityIcons 
              name="arrow-left" 
              size={24} 
              color="#009DC4"
            />
          </Animated.View>
        </TouchableOpacity>
      )}
      {title && (
        <ThemedText style={styles.title}>
          {title}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
}); 