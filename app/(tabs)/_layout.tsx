import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, Platform, Animated } from 'react-native';
import { useGlobalSearchParams } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { LoadingOverlay } from '@/src/components/LoadingOverlay';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function TabLayout() {
  const { workerId: authWorkerId, loading } = useAuth();
  const params = useGlobalSearchParams();
  const currentWorkerId = params.workerId || authWorkerId;

  useEffect(() => {
    if (currentWorkerId) {
      console.log('🟢 [_layout.tsx] Using workerId:', currentWorkerId);
    }
  }, [currentWorkerId]);

  if (loading) {
    return <LoadingOverlay message="Preparing your workspace, please wait..." />;
  }

  const TabIcon = ({ 
    focused, 
    iconName,
    label,
    size = 28,
    style,
  }: { 
    focused: boolean;
    iconName: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    size?: number;
    style?: any;
  }) => {
    // Create animated value for scale
    const scaleValue = React.useRef(new Animated.Value(1)).current;
    
    React.useEffect(() => {
      if (focused) {
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start();
      }
    }, [focused]);

    return (
      <View style={{
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        width: '100%',
      }}>
        <Animated.View style={{
          transform: [{ scale: scaleValue }]
        }}>
          <MaterialCommunityIcons 
            name={iconName}
            size={size}
            color={focused ? '#009DC4' : 'rgba(0,0,0,0.5)'}
            style={style}
          />
        </Animated.View>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'white',
            height: 65,
            borderTopWidth: 0,
            elevation: Platform.OS === 'android' ? 10 : 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            paddingHorizontal: 25,
            paddingBottom: Platform.OS === 'ios' ? 20 : 10,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          tabBarShowLabel: false,
          tabBarItemStyle: {
            height: 35,
            width: 35,
            marginHorizontal: 15,
            marginTop: 15,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: (props) => (
              <TabIcon 
                {...props} 
                iconName="view-dashboard" 
                label="Dashboard"
              />
            )
          }}
          initialParams={{ workerId: currentWorkerId }}
        />
      
      
        <Tabs.Screen
          name="assigned"
          options={{
            tabBarIcon: (props) => (
              <TabIcon 
                {...props} 
                iconName="briefcase-outline" 
                label="Assigned"
              />
            )
          }}
          initialParams={{ workerId: currentWorkerId }}
        />
        
        
        <Tabs.Screen
              name="jobs"
              options={{
                tabBarIcon: (props) => (
                  <TabIcon 
                    {...props} 
                    iconName="calendar-multiselect" 
                    label="Jobs"
                    size={35}
                    style={{ transform: [{ scale: 1.2 }] }}
                  />
                ),
               
               
              }}
              initialParams={{ workerId: currentWorkerId }}
        />
        <Tabs.Screen
          name="customers"
          options={{
            tabBarIcon: (props) => (
              <TabIcon 
                {...props} 
                iconName="account-group-outline" 
                label="Customers"
              />
            )
          }}
          initialParams={{ workerId: currentWorkerId }}
        />

          
      
            
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: (props) => (
              <TabIcon 
                {...props} 
                iconName="account-circle-outline" 
                label="Profile"
              />
            )
          }}
          initialParams={{ workerId: currentWorkerId }}
        />

        {/* Hidden routes */}
        <Tabs.Screen
          name="locations"
          options={{ href: null }}
          initialParams={{ workerId: currentWorkerId }}
        />

        <Tabs.Screen
          name="job/[id]"
          options={{ href: null }}
          initialParams={{ workerId: currentWorkerId }}
        />

        <Tabs.Screen
          name="customer/[id]"
          options={{ href: null }}
          initialParams={{ workerId: currentWorkerId }}
        />

        <Tabs.Screen
          name="index"
          options={{ href: null }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}