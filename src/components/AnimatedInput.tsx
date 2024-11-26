import * as React from 'react';
import { 
  TextInput, 
  StyleSheet, 
  Animated,
  View, 
  TouchableOpacity,
  TextInputProps 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';

interface AnimatedInputProps extends TextInputProps {
  icon: string;
  isPassword?: boolean;
}

export function AnimatedInput({ 
  icon, 
  isPassword, 
  ...props 
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const animateInput = (toValue: number) => {
    Animated.spring(animatedValue, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  };

  return (
    <Animated.View style={[
      styles.inputWrapper,
      {
        transform: [{
          scale: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.02]
          })
        }],
        borderColor: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['#E0E0E0', '#009DC4']
        })
      }
    ]}>
      <MaterialCommunityIcons 
        name={icon} 
        size={20} 
        color={isFocused ? '#009DC4' : '#666'} 
        style={styles.inputIcon}
      />
      <TextInput
        {...props}
        style={[styles.input, styles.inputWithIcon]}
        placeholderTextColor="#666"
        secureTextEntry={isPassword && !showPassword}
        onFocus={() => {
          setIsFocused(true);
          animateInput(1);
        }}
        onBlur={() => {
          setIsFocused(false);
          animateInput(0);
        }}
      />
      {isPassword && (
        <TouchableOpacity 
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <MaterialCommunityIcons 
            name={showPassword ? "eye-off" : "eye"} 
            size={20} 
            color="#666"
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginLeft: 16,
  },
  eyeIcon: {
    padding: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
}); 