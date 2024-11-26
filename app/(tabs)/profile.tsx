import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, SafeAreaView, ImageSourcePropType, ActivityIndicator, Alert, Dimensions, Platform, ScrollView } from 'react-native';
import { ThemedText } from '../../src/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { db, auth } from '../../src/config/firebase';
import { doc, getDoc, collection, query, where, getDocs, serverTimestamp, updateDoc, arrayUnion, setDoc, onSnapshot } from 'firebase/firestore';
import { User } from '@/src/types/user';
import { useLocalSearchParams } from 'expo-router';
import { GuideButton } from '@/src/components/common/GuideButton';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';

interface AssignedWorker {
  workerId: string;
  workerName: string;
  workerStatus?: string;
  timeStarted?: string;
}

interface Job {
  assignedWorkers: AssignedWorker[];
  // ... other job fields
}

// Add this interface for job metrics
interface JobMetrics {
  assigned: number;
  inProgress: number;
  completed: number;
}

const windowHeight = Dimensions.get('window').height;

export default function ProfileScreen() {
  const { width, height } = Dimensions.get('window');

  const { workerId } = useLocalSearchParams<{ workerId: string }>();
  const { user } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [jobMetrics, setJobMetrics] = useState<JobMetrics>({
    assigned: 0,
    inProgress: 0,
    completed: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockIn, setIsClockIn] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [workingTime, setWorkingTime] = useState('00:00:00');
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const { SignOut } = useAuth();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [lastClockEvent, setLastClockEvent] = useState<{
    type: string;
    timestamp: string;
  } | null>(null);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [totalBreakTime, setTotalBreakTime] = useState(0); // in milliseconds
  const [pausedWorkingTime, setPausedWorkingTime] = useState(0); // Store working time when taking break

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', workerId));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setUserData(userData);
            console.log('Worker ID from params:', workerId);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [user, workerId]);

  // Replace the existing fetchJobStats with this new function
  const fetchJobMetrics = async () => {
    if (!workerId) return;
    
    try {
      const jobsRef = collection(db, 'jobs');
      const querySnapshot = await getDocs(jobsRef);
      
      const metrics = {
        assigned: 0,
        inProgress: 0,
        completed: 0
      };

      querySnapshot.forEach(doc => {
        const job = doc.data();
        
        // Find this worker's assignment
        const workerAssignment = job.assignedWorkers?.find(
          (worker: { workerId: string; workerStatus?: string }) => 
            worker.workerId === workerId
        );

        // Skip if worker not assigned to this job
        if (!workerAssignment) return;

        // Count total assignments
        metrics.assigned++;

        // Check worker's specific status
        if (workerAssignment.workerStatus === 'Job Completed' || workerAssignment.workerStatus === 'Completed' || workerAssignment.workerStatus === 'Complete') {
          metrics.completed++;
        } else if (workerAssignment.workerStatus === 'In Progress') {
          metrics.inProgress++;
        }

        // Debug log
        console.log('Job:', job.jobID, 'Worker Status:', workerAssignment.workerStatus);
      });

      console.log('Final Metrics:', metrics);
      setJobMetrics(metrics);
    } catch (error) {
      console.error('Error fetching job metrics:', error);
    }
  };

  // Update useEffect to use new function
  useEffect(() => {
    fetchJobMetrics();
  }, [workerId]);

  useEffect(() => {
    const fetchClockStatus = async () => {
      if (!workerId) return;
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const attendanceDoc = await getDoc(
          doc(db, 'users', workerId, 'attendanceLogs', today)
        );
        
        if (attendanceDoc.exists()) {
          setIsClockIn(attendanceDoc.data().isClockIn || false);
        }
      } catch (error) {
        console.error('Error fetching clock status:', error);
      }
    };

    fetchClockStatus();
  }, [workerId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isClockIn && clockInTime && !isBreak) {
      timer = setInterval(() => {
        const now = new Date();
        const diff = Math.max(0, now.getTime() - clockInTime.getTime() - totalBreakTime + pausedWorkingTime);
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const formattedTime = hours >= 0 && minutes >= 0 && seconds >= 0
          ? `${hours.toString().padStart(2, '0')}:${minutes
              .toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          : '00:00:00';
        
        setWorkingTime(formattedTime);
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isClockIn, clockInTime, isBreak, totalBreakTime, pausedWorkingTime]);

  useEffect(() => {
    if (!user && isClockIn) {
      handleAutoClockOut();
    }
  }, [user]);

  useEffect(() => {
    if (!workerId) return;

    const today = new Date().toISOString().split('T')[0];
    const attendanceRef = doc(db, 'users', workerId, 'attendanceLogs', today);

    const unsubscribe = onSnapshot(attendanceRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const events = data.clockEvents || [];
        if (events.length > 0) {
          setLastClockEvent(events[events.length - 1]);
        }
      }
    });

    return () => unsubscribe();
  }, [workerId]);

  const handleAutoClockOut = async () => {
    if (!workerId) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceRef = doc(db, 'users', workerId, 'attendanceLogs', today);
      const now = new Date();

      await updateDoc(attendanceRef, {
        clockEvents: arrayUnion({
          timestamp: now.toISOString(),
          type: 'clockOut',
          automatic: true,
        }),
        clockOut: now.toISOString(),
        isClockIn: false,
        lastUpdated: now.toISOString(),
      });

      setIsClockIn(false);
      setClockInTime(null);
      setWorkingTime('00:00:00');
      setIsBreak(false);
      
      // Store last clock event
      setLastClockEvent({
        type: 'clockOut',
        timestamp: now.toISOString()
      });

      Alert.alert(
        'Auto Clock-Out',
        'You have been automatically clocked out.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error handling auto clock-out:', error);
    }
  };

  const handleClockInOut = async () => {
    if (!workerId || isClockingIn) return;
    
    if (isClockIn) {
      Alert.alert(
        'Confirm Clock Out',
        'Are you sure you want to clock out?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Clock Out',
            style: 'destructive',
            onPress: async () => {
              setIsClockingIn(true);
              try {
                const today = new Date().toISOString().split('T')[0];
                const attendanceRef = doc(db, 'users', workerId, 'attendanceLogs', today);
                const now = new Date();
                
                await updateDoc(attendanceRef, {
                  clockEvents: arrayUnion({
                    timestamp: now.toISOString(),
                    type: 'clockOut',
                    totalWorkingTime: now.getTime() - clockInTime!.getTime() - totalBreakTime
                  }),
                  clockOut: now.toISOString(),
                  isClockIn: false,
                  totalWorkingTime: now.getTime() - clockInTime!.getTime() - totalBreakTime,
                  lastUpdated: now.toISOString(),
                });
                setClockInTime(null);
                setWorkingTime('00:00:00');
                setIsBreak(false);
                setTotalBreakTime(0);
                setIsClockIn(false);

                // Success alert after clock out
                Alert.alert(
                  'Clock Out Successful',
                  `You have been clocked out at ${now.toLocaleTimeString()}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                console.error('Error updating clock status:', error);
                Alert.alert('Error', 'Failed to clock out. Please try again.');
              } finally {
                setIsClockingIn(false);
              }
            }
          }
        ]
      );
    } else {
      // Clock In logic
      setIsClockingIn(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const attendanceRef = doc(db, 'users', workerId, 'attendanceLogs', today);
        const now = new Date();

        await setDoc(attendanceRef, {
          clockEvents: arrayUnion({
            timestamp: now.toISOString(),
            type: 'clockIn'
          }),
          clockIn: now.toISOString(),
          isClockIn: true,
          lastUpdated: now.toISOString(),
        }, { merge: true });

        setClockInTime(now);
        setTotalBreakTime(0);
        setPausedWorkingTime(0);
        setIsClockIn(true);
      } catch (error) {
        console.error('Error updating clock status:', error);
        Alert.alert('Error', 'Failed to clock in. Please try again.');
      } finally {
        setIsClockingIn(false);
      }
    }
  };

  const handleBreak = async () => {
    if (!workerId || isClockingIn) return;
    
    setIsClockingIn(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceRef = doc(db, 'users', workerId, 'attendanceLogs', today);
      const now = new Date();

      if (!isBreak) {
        // Starting break
        setBreakStartTime(now);
        setPausedWorkingTime(now.getTime() - clockInTime!.getTime() - totalBreakTime);
        
        await updateDoc(attendanceRef, {
          clockEvents: arrayUnion({
            timestamp: now.toISOString(),
            type: 'breakStart',
            pausedWorkingTime: pausedWorkingTime
          }),
          breakStart: now.toISOString(),
          isBreak: true,
          lastUpdated: now.toISOString(),
        });
      } else {
        // Ending break
        const breakDuration = now.getTime() - breakStartTime!.getTime();
        const newTotalBreakTime = totalBreakTime + breakDuration;
        setTotalBreakTime(newTotalBreakTime);
        
        await updateDoc(attendanceRef, {
          clockEvents: arrayUnion({
            timestamp: now.toISOString(),
            type: 'breakEnd',
            breakDuration: breakDuration,
            totalBreakTime: newTotalBreakTime
          }),
          breakEnd: now.toISOString(),
          isBreak: false,
          totalBreakTime: newTotalBreakTime,
          lastUpdated: now.toISOString(),
        });
      }

      setIsBreak(!isBreak);
      
      Alert.alert(
        isBreak ? 'Break Ended' : 'Break Started',
        `You have ${isBreak ? 'ended' : 'started'} your break at ${now.toLocaleTimeString()}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error updating break status:', error);
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (isClockIn) {
        await handleAutoClockOut(); // Auto clock-out before logout
      }
      await SignOut();
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  // Add function to get user's full name
  const getFullName = () => {
    if (userData?.fullName) {
      return userData.fullName;
    }
    // If no display name, try to create one from email
    if (userData?.email) {
      return userData.email.split('@')[0];
    }
    return 'Guest User';
  };

  // Add function to get profile picture
  const getProfilePicture = () => {
    if (userData?.profilePicture) {
      return { uri: userData.profilePicture };
    }
    // You could return a default image here if needed
    return null;
  };

  // Add this function to handle update checks
  const checkForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      if (__DEV__) {
        Alert.alert(
          'Development Mode',
          'Update checking is only available in production builds.',
          [{ text: 'OK' }]
        );
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          'Update Available',
          'Would you like to update the app now?',
          [
            {
              text: 'Yes',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  Alert.alert(
                    'Update Downloaded',
                    'The app will now restart to apply the update.',
                    [
                      {
                        text: 'OK',
                        onPress: async () => {
                          await Updates.reloadAsync();
                        },
                      },
                    ]
                  );
                } catch (error) {
                  Alert.alert('Error', 'Failed to download update. Please try again later.');
                }
              },
            },
            {
              text: 'No',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('No Updates', 'You are using the latest version.');
      }
    } catch (error) {
      console.error('Update check error:', error);
      Alert.alert(
        'Error',
        'Failed to check for updates. Please ensure you have an internet connection and try again.'
      );
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Update the render section for the clock event container
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <GuideButton 
            title="Profile"
            steps={[
              { target: 'profile', title: 'Profile', description: 'View your profile' },
              { target: 'stats', title: 'Stats', description: 'View your stats' },
              { target: 'clock', title: 'Clock In/Out', description: 'Clock in and out to start and end your shift' }
            ]}
          />
          <ThemedText style={styles.headerTitle}>Profile</ThemedText>
          <View style={styles.headerRight}>
            <ThemedText style={styles.workerIdText}>ID: {workerId}</ThemedText>
            <TouchableOpacity 
              style={styles.headerUpdateButton}
              onPress={checkForUpdates}
              disabled={isCheckingUpdate}
            >
              <MaterialCommunityIcons 
                name="update" 
                size={20} 
                color="white" 
                style={[
                  styles.updateIcon,
                  isCheckingUpdate && { transform: [{ rotate: '360deg' }] }
                ]} 
              />
              {isCheckingUpdate && (
                <ActivityIndicator size="small" color="white" style={styles.updateSpinner} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {getProfilePicture() ? (
              <Image 
                source={getProfilePicture() as ImageSourcePropType} 
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <ThemedText style={styles.avatarText}>
                  {getFullName().charAt(0).toUpperCase()}
                </ThemedText>
                
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <ThemedText style={styles.userName}>
              {getFullName()}
            </ThemedText>
            <ThemedText style={styles.userRole}>
              {userData?.email || 'No email provided'}
            </ThemedText>
          </View>

             {/* Last Clock Event */}
             {lastClockEvent && (
            <View style={styles.lastClockEventContainer}>
              <ThemedText style={styles.lastClockEventText}>
                Last {lastClockEvent.type === 'clockIn' ? 'Clock In' : 'Clock Out'}: {' '}
                {new Date(lastClockEvent.timestamp).toLocaleTimeString()}
              </ThemedText>
            </View>
          )}

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={24} color="#009DC4" />
              <ThemedText style={styles.statNumber}>
                {jobMetrics.assigned?.toString().padStart(2, '0') || '00'}
              </ThemedText>
              <ThemedText style={styles.statLabel}>
                Assigned
              </ThemedText>
            </View>

            <View style={styles.statBox}>
              <MaterialCommunityIcons name="progress-check" size={24} color="#009DC4" />
              <ThemedText style={styles.statNumber}>
                {jobMetrics.inProgress?.toString().padStart(2, '0') || '00'}
              </ThemedText>
              <ThemedText style={styles.statLabel}>
                In Progress
              </ThemedText>
            </View>

            <View style={styles.statBox}>
              <MaterialCommunityIcons name="check-circle-outline" size={24} color="#009DC4" />
              <ThemedText style={styles.statNumber}>
                {jobMetrics.completed?.toString().padStart(2, '0') || '00'}
              </ThemedText>
              <ThemedText style={styles.statLabel}>
                Completed
              </ThemedText>
            </View>
          </View>

          <ThemedText style={styles.lastUpdate}>
            Latest Update: {new Date().toLocaleDateString()}
          </ThemedText>

          {/* Working Time Display */}
          {isClockIn && (
            <View style={styles.timerContainer}>
              <ThemedText style={styles.timerLabel}>
                Working Time{isBreak ? ' (On Break)' : ''}:
              </ThemedText>
              <ThemedText style={[
                styles.timerText,
                isBreak && styles.timerTextPaused
              ]}>
                {workingTime}
              </ThemedText>
            </View>
          )}

          

          {/* Break and Clock buttons */}
          <View style={styles.buttonContainer}>
            {isClockIn && (
              <TouchableOpacity
                style={[
                  styles.breakButton,
                  isBreak ? styles.breakEndButton : styles.breakStartButton
                ]}
                onPress={handleBreak}
                disabled={isClockingIn}
              >
                <ThemedText style={styles.breakButtonText}>
                  {isClockingIn ? 'Processing...' : isBreak ? 'End Break' : 'Take a Break'}
                </ThemedText>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[
                styles.clockButton, 
                isClockIn ? styles.clockOutButton : styles.clockInButton
              ]}
              onPress={handleClockInOut}
              disabled={isClockingIn}
            >
              <ThemedText style={styles.clockButtonText}>
                {isClockingIn ? 'Processing...' : isClockIn ? 'Clock Out' : 'Clock In'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <MaterialCommunityIcons name="logout" size={24} color="#FF6B6B" />
              <ThemedText style={styles.logoutButtonText}>Logout</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    
  );
  
}

const additionalStyles = StyleSheet.create({
  workerIdText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 'auto',
    marginRight: 20,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#009DC4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    marginLeft: 20,
  },
  profileSection: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: windowHeight * 0.08,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: 'center',
    paddingTop: windowHeight * 0.08,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'absolute',
    top: -60,
    backgroundColor: 'white',
    padding: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#009DC4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 40,
    fontWeight: '600',
  },
  userInfo: {
    alignItems: 'center',
    marginTop: 10,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  userRole: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: windowHeight * 0.03,
    gap: Platform.OS === 'ios' ? 20 : 10,
  },
  statBox: {
    width: Dimensions.get('window').width * 0.25,
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 5,
  },
  activeStatBox: {
    backgroundColor: '#009DC4',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 5,
  },
  lastUpdate: {
    color: '#666',
    fontSize: 14,
    marginTop: 30,
  },
  clockButton: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  clockInButton: {
    backgroundColor: '#009DC4',
  },
  clockOutButton: {
    backgroundColor: '#FF6B6B',
  },
  clockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#009DC4',
  },
  breakButton: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  breakStartButton: {
    backgroundColor: '#FFA500',
  },
  breakEndButton: {
    backgroundColor: '#32CD32',
  },
  breakButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 5,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    width: '100%',
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 10,
  },
  workerIdText: {
    fontSize: 14,
    color: 'white',
  },
  headerUpdateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  updateIcon: {
    opacity: 0.9,
  },
  updateSpinner: {
    position: 'absolute',
  },
  lastClockEventContainer: {
    backgroundColor: '#F5F5F5',
    padding: Dimensions.get('window').width * 0.03, // 3% of screen width
    borderRadius: 8,
    marginTop: Dimensions.get('window').height * 0.01, // 1% of screen height
  },
  lastClockEventText: {
    fontSize: Math.min(Dimensions.get('window').width * 0.035, 14), // Responsive font size with max limit
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },

  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 'auto', // Push buttons to bottom
    gap: 10, // Add consistent spacing between buttons
  },
  timerTextPaused: {
    color: '#FFA500',
  },
  clockEventSection: {
    width: Dimensions.get('window').width * 0.9,
    alignSelf: 'center',
    marginVertical: Dimensions.get('window').height * 0.02,
  },
  updateContainer: {
    backgroundColor: '#F5F5F5',
    padding: Dimensions.get('window').width * 0.03,
    borderRadius: 8,
    marginBottom: Dimensions.get('window').height * 0.01,
  },
  updateText: {
    fontSize: Math.min(Dimensions.get('window').width * 0.035, 14), // Responsive font size with max limit
    color: '#666',
    textAlign: 'center',
  },

});


