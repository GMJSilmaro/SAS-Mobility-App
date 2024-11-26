import React, { useRef } from 'react'
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Animated, Easing, Image, RefreshControl, Alert } from 'react-native'
import { router, useGlobalSearchParams } from 'expo-router'
import { useAuth } from '@/src/hooks/useAuth'
import { LoadingOverlay } from '@/src/components/LoadingOverlay'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LineChart } from 'react-native-chart-kit'
import { Dimensions } from 'react-native'
import { db } from '@/src/config/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { User } from '@/src/types/user'
import { collection, query, where, getDocs } from 'firebase/firestore'

const COLORS = {
  primary: '#009DC4',
  background: '#f5f5f5',
  white: '#FFFFFF',
  text: {
    dark: '#333333',
    light: '#666666',
    accent: '#FF9800'
  },
  status: {
    inProgress: '#4CAF50',
    upcoming: '#009DC4',
    overdue: '#FF5252',
    reschedule: '#FFC107'
  }
}

const AnimatedBellIcon = ({ badgeCount }: { badgeCount?: number }) => {
  const rotateValue = new Animated.Value(0)

  const startAnimation = () => {
    // Reset the value
    rotateValue.setValue(0)

    // Create the animation
    Animated.sequence([
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(rotateValue, {
        toValue: -1,
        duration: 400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(rotateValue, {
        toValue: 0,
        duration: 200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Restart animation after 3 seconds
      setTimeout(startAnimation, 3000)
    })
  }

  // Start animation when component mounts
  React.useEffect(() => {
    startAnimation()
  }, [])

  const rotate = rotateValue.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg']
  })

  return (
    <TouchableOpacity style={styles.iconSpacing}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <MaterialCommunityIcons name="bell-outline" size={24} color="white" />
      </Animated.View>
      {badgeCount && badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const Home = () => {
  const { workerId: paramWorkerId } = useGlobalSearchParams()
  const { workerId: authWorkerId, loading } = useAuth()
  const [notificationsCount] = React.useState(3)
  const [userData, setUserData] = React.useState<User | null>(null)
  const waveAnimation = useRef(new Animated.Value(0))
  const [assignedJobsCount, setAssignedJobsCount] = React.useState(0);
  const [jobMetrics, setJobMetrics] = React.useState({
    inProgress: 0,
    upcoming: 0,
    overdue: 0,
    reschedule: 0
  });
  const [weeklyStats, setWeeklyStats] = React.useState([0, 0, 0, 0, 0, 0, 0]);
  const [tooltipPos, setTooltipPos] = React.useState({ 
    x: 0, 
    y: 0, 
    visible: false, 
    value: 0,
    label: '' 
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [totalAssignedJobs, setTotalAssignedJobs] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);

  const currentWorkerId = paramWorkerId || authWorkerId

  const fetchUserData = async () => {
    if (currentWorkerId && typeof currentWorkerId === 'string') {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentWorkerId))
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }
  }

  const fetchJobMetrics = async () => {
    if (!currentWorkerId) {
      console.log('Missing workerId, returning early');
      return;
    }

    try {
      const jobsRef = collection(db, 'jobs');
      const querySnapshot = await getDocs(jobsRef);
      console.log('Total jobs fetched:', querySnapshot.size);

      const metrics = {
        inProgress: 0,
        upcoming: 0,
        overdue: 0,
        reschedule: 0
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      querySnapshot.forEach(doc => {
        const job = doc.data();
        
        // First check if the current worker is assigned to this job
        const workerData = job.assignedWorkers?.find(
          (worker: { workerId: string }) => worker.workerId === currentWorkerId
        );

        if (!workerData) return;

        console.log('Processing job:', job.jobID, 'Job status:', job.jobStatus);
        
        const startDate = job.startDate ? new Date(job.startDate) : null;
        if (startDate) startDate.setHours(0, 0, 0, 0);

        // Updated status checking logic
        if (job.jobStatus?.toLowerCase() === 'rescheduled') {
          metrics.reschedule++;
        } else if (job.jobStatus?.toLowerCase() === 'in progress') {
          metrics.inProgress++;
        } else if (startDate && startDate < today && 
                   !['completed', 'rescheduled'].includes(job.jobStatus?.toLowerCase() || '')) {
          metrics.overdue++;
        } else if ((!job.jobStatus || job.jobStatus === '' || 
                   !['completed', 'rescheduled', 'in progress'].includes(job.jobStatus?.toLowerCase()))) {
          // Count as upcoming if:
          // - No status
          // - Empty status
          // - Status is not completed, rescheduled, or in progress
          metrics.upcoming++;
        }

        // Debug logging
        console.log(`Job ${job.jobID}:`, {
          status: job.jobStatus,
          startDate: startDate,
          isUpcoming: (!job.jobStatus || job.jobStatus === '' || 
                      !['completed', 'rescheduled', 'in progress'].includes(job.jobStatus?.toLowerCase())),
          metrics: { ...metrics }
        });
      });

      console.log('Final metrics:', metrics);
      setJobMetrics(metrics);
      
    } catch (error) {
      console.error('Error fetching job metrics:', error);
    }
  };

  const fetchWeeklyStats = async () => {
    console.log('Starting fetchWeeklyStats...');
    if (!currentWorkerId) {
      console.log('Missing workerId for weekly stats');
      return;
    }

    try {
      const jobsRef = collection(db, 'jobs');
      const weekStats = [0, 0, 0, 0, 0, 0, 0];
      
      const querySnapshot = await getDocs(jobsRef);
      console.log('Total jobs found:', querySnapshot.size);

      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start from Monday
      startOfWeek.setHours(0, 0, 0, 0);

      querySnapshot.forEach(doc => {
        const job = doc.data();
        
        // Check if worker is assigned to this job
        const isAssigned = job.assignedWorkers?.some(
          (worker: { workerId: string }) => worker.workerId === currentWorkerId
        );

        if (isAssigned && job.startDate) {
          const jobDate = new Date(job.startDate);
          
          // Only count jobs from current week
          if (jobDate >= startOfWeek) {
            const dayIndex = (jobDate.getDay() + 6) % 7; // Convert to Mon=0, Sun=6
            weekStats[dayIndex]++;
            console.log(`Added job for ${jobDate.toDateString()} at index ${dayIndex}`);
          }
        }
      });

      console.log('Weekly stats:', weekStats);
      setWeeklyStats(weekStats);
    } catch (error) {
      console.error('Error in fetchWeeklyStats:', error);
    }
  };

  const fetchTotalAssignedJobs = async () => {
    console.log('Fetching total assigned jobs...');
    console.log('currentWorkerId:', currentWorkerId);

    if (!currentWorkerId) {
      console.log('No workerId, returning early');
      return;
    }

    try {
      const jobsRef = collection(db, 'jobs');
      
      // Get all jobs
      const allJobsSnapshot = await getDocs(jobsRef);
      let total = 0;

      // Filter jobs where assignedWorkers array contains an object with matching workerId
      allJobsSnapshot.forEach(doc => {
        const job = doc.data();
        const isAssigned = job.assignedWorkers?.some(
          (worker: { workerId: string }) => worker.workerId === currentWorkerId
        );
        if (isAssigned) {
          total++;
        }
      });
      
      console.log('Total assigned jobs:', total);
      setTotalAssignedJobs(total);
    } catch (error) {
      console.error('Error fetching total assigned jobs:', error);
      setTotalAssignedJobs(0);
    }
  };

  // Combine all data fetching into a single useEffect
  React.useEffect(() => {
    const fetchData = async () => {
      if (!currentWorkerId) return;
      
      try {
        await fetchUserData();
        await Promise.all([
          fetchJobMetrics(),
          fetchWeeklyStats(),
          fetchTotalAssignedJobs()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentWorkerId]);

  // Keep wave animation effect
  React.useEffect(() => {
    const waveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnimation.current, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnimation.current, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    waveLoop.start();
    return () => waveLoop.stop();
  }, []);

  // Debug log effect
  React.useEffect(() => {
    console.log('Current jobMetrics state:', jobMetrics);
  }, [jobMetrics]);

  const getFullName = () => {
    if (userData?.fullName) {
      return userData.fullName
    }
    if (userData?.email) {
      return userData.email.split('@')[0]
    }
    return currentWorkerId
  }

  const getProfilePicture = () => {
    if (userData?.profilePicture) {
      return { uri: userData.profilePicture }
    }
    return null
  }

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchUserData();
      await Promise.all([
        fetchJobMetrics(),
        fetchWeeklyStats(),
        fetchTotalAssignedJobs()
      ]);
      // Add alert after successful refresh
      Alert.alert(
        "Dashboard Updated",
        "No new updates available",
        [{ text: "OK", onPress: () => console.log("Alert closed") }]
      );
    } catch (error) {
      console.error('Error refreshing data:', error);
      // Add error alert
      Alert.alert(
        "Update Failed",
        "Failed to refresh dashboard data",
        [{ text: "OK", onPress: () => console.log("Error alert closed") }]
      );
    }
    setRefreshing(false);
  }, [currentWorkerId]);

  // Show loading state
  if (loading || isLoading || !userData) {
    return <LoadingOverlay message="Loading your dashboard..." type="init" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity>
            <Image 
              source={require('@/assets/images/SAS-LOGO.png')}
              style={styles.logoImage}
              tintColor="white"
            />
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            {/* <AnimatedBellIcon badgeCount={notificationsCount} /> */}
            <TouchableOpacity onPress={() => router.push('/profile')}>
              {getProfilePicture() ? (
                <Image 
                  source={getProfilePicture()!}
                  style={styles.profileImage}
                />
              ) : (
                <MaterialCommunityIcons name="account-circle" size={50} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Hello, {getFullName()}</Text>
          <Animated.View
            style={[
              styles.waveHand,
              {
                transform: [{
                  rotate: waveAnimation.current.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: ['0deg', '20deg', '0deg']
                  })
                }]
              }
            ]}
          >
            <Text style={styles.handEmoji}>👋</Text>
          </Animated.View>
        </View>
        <View style={styles.headerControls}>
          <TouchableOpacity 
            style={styles.checkInButton}
            onPress={() => router.push('/profile')}
          >
            <MaterialCommunityIcons name="login" size={18} color="white" />
            <Text style={styles.checkInText}>Clock-In</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity>
            <MaterialCommunityIcons name="cog" size={24} color="white" />
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Appointments Jobs - Fixed Section */}
      <View style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentTitle}>
            <MaterialCommunityIcons name="calendar-blank" size={45} color="#FF9800" />
            <Text style={styles.appointmentText}>Assigned Jobs</Text>
          </View>
          <Text style={styles.totalNumber}>
            {totalAssignedJobs.toString().padStart(2, '0')}
          </Text>
        </View>
        <Text style={styles.appointmentSubtitle}>Your scheduled assigned jobs for today</Text>
      </View>

      {/* Content - Scrollable */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Job Status Grid */}
        <View style={styles.gridContainer}>
          <JobStatusCard 
            title="Jobs in Progress" 
            number={jobMetrics.inProgress?.toString().padStart(2, '0') || '00'} 
            color={COLORS.status.inProgress} 
            icon="progress-check"
          />
          <JobStatusCard 
            title="Upcoming Jobs" 
            number={jobMetrics.upcoming?.toString().padStart(2, '0') || '00'} 
            color={COLORS.status.upcoming} 
            icon="calendar-account"
          />
          <JobStatusCard 
            title="Overdue Jobs" 
            number={jobMetrics.overdue?.toString().padStart(2, '0') || '00'} 
            color={COLORS.status.overdue} 
            icon="alert-circle-outline"
          />
          <JobStatusCard 
            title="Reschedule" 
            number={jobMetrics.reschedule?.toString().padStart(2, '0') || '00'} 
            color={COLORS.status.reschedule} 
            icon="calendar-refresh"
          />
        </View>

        {/* Add this new section */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Weekly Job Statistics</Text>
          <LineChart
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                data: weeklyStats,
                color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                strokeWidth: 2,
              }]
            }}
            width={Dimensions.get('window').width - 32}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            yAxisInterval={5}
            chartConfig={{
              backgroundColor: COLORS.white,
              backgroundGradientFrom: COLORS.white,
              backgroundGradientTo: COLORS.white,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForLabels: {
                fontSize: 12,
              },
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#009DC4",
                fill: "white"
              },
              paddingTop: 16,
              count: 5,
            }}
            bezier
            style={{
              paddingRight: 40,
              paddingLeft: 0,
              marginLeft: -5,
            }}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={true}
            withHorizontalLines={true}
            fromZero={true}
            decorator={() => {
              if (tooltipPos.visible) {
                return (
                  <View style={{
                    position: 'absolute',
                    left: tooltipPos.x - 40,
                    bottom: tooltipPos.y + 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 4,
                    borderRadius: 4,
                    minWidth: 80,
                    alignItems: 'center',
                    zIndex: 1000,
                  }}>
                    <View style={{
                      position: 'absolute',
                      top: -8,
                      width: 0,
                      height: 0,
                      backgroundColor: 'transparent',
                      borderStyle: 'solid',
                      borderLeftWidth: 8,
                      borderRightWidth: 8,
                      borderBottomWidth: 8,
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                      borderBottomColor: 'rgba(0, 0, 0, 0.8)',
                      alignSelf: 'center',
                    }} />
                    <Text style={{
                      color: 'white',
                      fontSize: 12,
                      fontWeight: '600',
                      textAlign: 'center',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}>
                      {`${tooltipPos.label}: ${tooltipPos.value} ${tooltipPos.value === 1 ? 'Job' : 'Jobs'}`}
                    </Text>
                  </View>
                );
              }
              return null;
            }}
            onDataPointClick={({value, getColor, x, y, index}) => {
              const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              const dayLabel = days[index];
              
              setTooltipPos({
                x: x,
                y: y,
                value: value,
                visible: true,
                label: dayLabel
              });
              
              // Auto-hide tooltip after 3 seconds
              setTimeout(() => {
                setTooltipPos(prev => ({
                  ...prev,
                  visible: false
                }));
              }, 3000);
            }}
          />
        </View>
      </ScrollView>
    </View>
  )
}

// Job Status Card Component
const JobStatusCard = ({ 
  title, 
  number, 
  color, 
  icon 
}: { 
  title: string, 
  number: string, 
  color: string, 
  icon: string 
}) => {
  console.log(`Rendering ${title} with number:`, number);
  return (
    <View style={styles.jobStatusCard}>
      <View style={styles.jobStatusContent}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={color} />
        </View>
        <View>
          <Text style={styles.jobStatusTitle}>{title}</Text>
          <Text style={[styles.jobStatusNumber, { color }]}>{number}</Text>
        </View>
      </View>
    </View>
  );
};

export default Home

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 5,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSpacing: {
    marginRight: 20,
  },
  greeting: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    elevation: 2,
    marginBottom: 10,
  },
  checkInText: {
    color: COLORS.white,
    marginLeft: 8,
    fontSize: 18,
  },
  content: {
    marginTop: -30,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    color: COLORS.text.dark,
  },
  sectionBadge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.accent,
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  jobStatusCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 5,
    padding: 15,
    marginTop: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  jobStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
    appointmentCard: {
      backgroundColor: 'white',
      borderRadius: 5,
      padding: 16,
      marginHorizontal: 16,
      marginTop: -10,
      marginBottom: 40,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    appointmentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    appointmentTitle: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    appointmentSubtitle: {
      fontSize: 14,
      color: COLORS.text.light,
      marginTop: -10,
    },
    appointmentText: {
      fontSize: 18,
      marginLeft: 8,
      color: '#333',
      fontWeight: '600',
    },
    totalNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FF9800',
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: '#f8f9fa',
      borderRadius: 12,
      padding: 12,
    },
    statBox: {
      width: '23%',
      alignItems: 'center',
      padding: 8,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    statLabel: {
      fontSize: 10,
      textAlign: 'center',
      color: '#666',
      marginTop: 4,
      lineHeight: 12,
    },
  jobStatusTitle: {
    fontSize: 14,
    color: COLORS.text.light,
  },
  jobStatusNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.dark,
    marginTop: 4,
  },
  cardContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  requestsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  requestBox: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  requestTitle: {
    fontSize: 14,
    color: COLORS.text.light,
  },
  requestNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  paymentBox: {
    width: '48%',
    borderRadius: 15,
    padding: 15,
  },
  paymentBoxTotal: {
    backgroundColor: '#f0f7ff',
  },
  paymentBoxCollected: {
    backgroundColor: '#e6f3e6',
  },
  paymentTitle: {
    fontSize: 13,
    color: COLORS.text.light,
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    color: COLORS.text.light,
    fontSize: 16,
  },
  chartContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 5,
    padding: 16,
    marginHorizontal: 10,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.dark,
    marginBottom: 10,
  },
  logoImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waveHand: {
    marginTop: 15,
  },
  handEmoji: {
    fontSize: 24,
  }
})