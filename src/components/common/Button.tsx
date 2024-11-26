import { Pressable, PressableProps, StyleSheet, StyleProp, ViewStyle, View } from 'react-native';
import { forwardRef } from 'react';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: 'default' | 'ghost';
  style?: StyleProp<ViewStyle>;
}

export const Button = forwardRef<View, ButtonProps>(
  ({ variant = 'default', style, ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        style={[
          styles.button,
          variant === 'ghost' ? styles.ghost : styles.default,
          style as ViewStyle,
        ]}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  default: {
    backgroundColor: '#007AFF',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
}); 