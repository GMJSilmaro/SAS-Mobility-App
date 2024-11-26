import React, { useEffect, useRef, useState } from 'react';
import { 
  TouchableOpacity, 
  Animated, 
  StyleSheet, 
  Easing, 
  Modal, 
  View, 
  Dimensions,
  TouchableWithoutFeedback,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';

export interface GuideStep {
  target: string;
  title: string;
  description: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface GuideButtonProps {
  title: string;
  steps: GuideStep[];
  backButton?: boolean;
}

export const GuideButton = ({ title, steps, backButton }: GuideButtonProps) => {
  // Animation values for icon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Add ref for the animation
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Animation value for the modal's lightbulb icon
  const modalIconAnim = useRef(new Animated.Value(0)).current;

  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Enhanced icon animations with cleanup
  useEffect(() => {
    // Create the animation
    animationRef.current = Animated.loop(
      Animated.parallel([
        // Pulse animation
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        
        // Gentle rotation
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Start the animation
    animationRef.current.start();

    // Cleanup function
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      // Reset animation values
      pulseAnim.setValue(1);
     
      rotateAnim.setValue(0);
    };
  }, []); // Empty dependency array since we want this to run once

  // Animate the modal icon when it becomes visible
  useEffect(() => {
    if (isGuideVisible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(modalIconAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(modalIconAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isGuideVisible]);

  const showGuide = () => {
    setCurrentStep(0);
    setIsGuideVisible(true);
  };

  const hideGuide = () => {
    setIsGuideVisible(false);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      hideGuide();
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg'],
  });

  const renderModalContent = () => {
    return (
      <TouchableWithoutFeedback onPress={nextStep}>
        <View style={styles.modalContainer}>
          <View style={styles.overlay}>
            <View style={StyleSheet.absoluteFill} />
          </View>

          <View style={styles.contentBox}>
            <View style={styles.stepIndicator}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepDot,
                    currentStep === index && styles.stepDotActive,
                  ]}
                />
              ))}
            </View>
            
            <View style={styles.contentHeader}>
              <View style={styles.iconContainer}>
                {/* Animated glow effect */}
                <Animated.View 
                  style={[
                    styles.iconGlow,
                    {
                      opacity: modalIconAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.1, 0.4]
                      }),
                      transform: [{
                        scale: modalIconAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.3]
                        })
                      }]
                    }
                  ]} 
                />
                <MaterialCommunityIcons 
                  name="lightbulb-on-outline" 
                  size={28} 
                  color="#009DC4" 
                />
              </View>
              <ThemedText style={styles.stepTitle}>
                {steps[currentStep].title}
              </ThemedText>
            </View>

            <ThemedText style={styles.stepDescription}>
              {steps[currentStep].description.split('NEW').map((part, i, arr) => 
                i < arr.length - 1 ? (
                  <React.Fragment key={i}>
                    {part}<ThemedText style={{ fontWeight: '700', color: '#009DC4' }}>NEW</ThemedText>
                  </React.Fragment>
                ) : part
              )}
            </ThemedText>

            <View style={styles.footer}>
              <ThemedText style={styles.stepCounter}>
                Step {currentStep + 1} of {steps.length}
              </ThemedText>
              <View style={styles.nextButton}>
                <ThemedText style={styles.tapText}>
                  Tap to {currentStep === steps.length - 1 ? 'finish' : 'continue'}
                </ThemedText>
                <MaterialCommunityIcons 
                  name="chevron-right-circle" 
                  size={20} 
                  color="#009DC4" 
                />
              </View>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  return (
    <>
      <TouchableOpacity onPress={showGuide} style={styles.container}>
        {/* Glow effect layer */}
        <Animated.View style={[
          styles.glowContainer,
          {
            transform: [{ scale: pulseAnim }],
          }
        ]}>
          
        </Animated.View>

        {/* Icon layer */}
        <Animated.View style={[
          styles.animatedContainer,
          {
            transform: [
              { scale: pulseAnim },
              { rotate: spin }
            ]
          }
        ]}>
          <MaterialCommunityIcons 
            name="information" 
            size={30} 
            color="#009DC4" 
          />
        </Animated.View>
      </TouchableOpacity>

      <Modal
        transparent
        visible={isGuideVisible}
        animationType="none"
        onRequestClose={hideGuide}
      >
        {renderModalContent()}
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    position: 'relative',
    marginRight: -16,
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  glow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#009DC4',
    opacity: 0.3,
    shadowColor: '#009DC4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  animatedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    shadowColor: '#009DC4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    position: 'relative',
    zIndex: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  contentBox: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  stepCounter: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  tapText: {
    fontSize: 15,
    color: '#009DC4',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E0',
  },
  stepDotActive: {
    backgroundColor: '#009DC4',
    width: 18,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
  },
  iconContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#009DC4',
    shadowColor: '#009DC4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
}); 