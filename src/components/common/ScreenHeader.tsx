import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { ThemedText } from '../ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getUserData } from '@/src/services/userService';
import { User } from '@/src/types/user';

interface ScreenHeaderProps {
  title?: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  hideLogout?: boolean;
  hideProfile?: boolean;
  onBack?: () => void;
}

export function ScreenHeader({ 
  title, 
  leftComponent,
  rightComponent, 
  hideLogout = false,
  hideProfile = false,
  onBack 
}: ScreenHeaderProps) {
  const { logout, user } = useAuth();
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [dropdownAnimation] = useState(new Animated.Value(0));
  const [userData, setUserData] = useState<User | null>(null);
  
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        const data = await getUserData(user.uid);
        setUserData(data);
      }
    };
    fetchUserData();
  }, [user?.uid]);

  const toggleDropdown = () => {
    const toValue = isDropdownVisible ? 0 : 1;
    setIsDropdownVisible(!isDropdownVisible);
    Animated.spring(dropdownAnimation, {
      toValue,
      useNativeDriver: true,
    }).start();
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.leftContent}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#2C3E50" />
            </TouchableOpacity>
          )}
          {leftComponent || (title && <ThemedText style={styles.title}>{title}</ThemedText>)}
        </View>
        <View style={styles.rightContent}>
          {rightComponent}
          {!hideProfile && (
            <TouchableOpacity style={styles.profileButton}>
              <View style={styles.profileContainer}>
                {userData?.profilePicture ? (
                  <Image 
                    source={{ uri: userData.profilePicture }}
                    style={styles.profileImage}
                  />
                ) : (
                  <MaterialCommunityIcons name="account-circle" size={32} color="#009DC4" />
                )}
                {userData?.isOnline && <View style={styles.onlineIndicator} />}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {isDropdownVisible && (
        <Animated.View style={[
          styles.dropdown,
          {
            transform: [{
              translateY: dropdownAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              })
            }],
            opacity: dropdownAnimation
          }
        ]}>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={logout}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#009DC4" />
            <ThemedText style={styles.dropdownText}>Logout</ThemedText>
          </TouchableOpacity>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56, // or your desired header height
  },
  rightComponent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '400',
  },
  emailText: {
    fontSize: 15,
    color: '#009DC4',
    fontWeight: '500',
  },
  logoutButton: {
    padding: 4,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  profileButton: {
    padding: 4,
  },
  profileContainer: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  dropdown: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
  },
  dropdownText: {
    fontSize: 14,
    color: '#2C3E50',
  },
});