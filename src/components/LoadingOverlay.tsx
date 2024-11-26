import React from 'react';
import { ActivityIndicator, StyleSheet, View, Text, Modal, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface LoadingOverlayProps {
  message?: string;
  type?: 'loading' | 'signin' | 'init' | 'workspace';
}

const { width } = Dimensions.get('window');

const getIconForType = (type: string) => {
  switch (type) {
    case 'signin':
      return 'login';
    case 'init':
      return 'application-cog';
    case 'workspace':
      return 'view-dashboard';
    default:
      return 'loading';
  }
};

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = 'Loading...', 
  type = 'loading' 
}) => {
  const iconName = getIconForType(type);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={true}
    >
      <BlurView intensity={50} style={styles.container}>
        <View style={styles.modalContent}>
          <View style={styles.loadingBox}>
            <View style={styles.iconContainer}>
             
              <ActivityIndicator 
                size="large" 
                color="#009DC4" 
                style={styles.spinner}
              />
            </View>
            <Text style={styles.message}>{message}</Text>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    minWidth: width * 0.8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    position: 'absolute',
    zIndex: 1,
  },
  spinner: {
    position: 'absolute',
    transform: [{ scale: 1.5 }],
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
}); 