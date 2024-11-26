import * as React from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  TouchableOpacityProps,
  View 
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface LoadingButtonProps extends TouchableOpacityProps {
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

export function LoadingButton({ 
  isLoading, 
  disabled, 
  children, 
  style, 
  ...props 
}: LoadingButtonProps) {
  return (
    <TouchableOpacity 
      {...props}
      style={[
        styles.button, 
        disabled && styles.buttonDisabled,
        isLoading && styles.buttonLoading,
        style
      ]}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <MaterialCommunityIcons name="loading" size={24} color="#FFF" />
      ) : (
        <View style={styles.buttonContent}>
          {children}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#009DC4',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#B0BEC5',
    opacity: 0.7,
  },
  buttonLoading: {
    opacity: 0.8,
  },
}); 