import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Button, Pressable, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, router, useRouter, useNavigation, Link } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getJob, updateJobStatus } from '../../../src/services/jobService';
import { Job, JobStatus } from '../../../src/types/job';
import { DetailsScreen } from '../../../src/screens/job/DetailsScreen';
import NavigateScreen from '../../../src/screens/job/NavigateScreen';
import { ServiceScreen } from '../../../src/screens/job/ServiceScreen';
import { CompleteScreen } from '../../../src/screens/job/CompleteScreen';
import Dialog from 'react-native-dialog';
import { GuideButton } from '@/src/components/common/GuideButton';
import { NavigationHeader } from '@/src/components/common/NavigationHeader';
import * as Location from 'expo-location';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TabType = 'Details' | 'Navigate' | 'Service' | 'Complete';


type StepProgress = {
  Details: boolean;
  Navigate: boolean;
  Service: boolean;
  Complete: boolean;
};

const StepIndicator = ({ 
  label, 
  icon, 
  isActive, 
  currentTab,
  onPress 
}: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  isActive: boolean;
  currentTab: string;
  onPress: () => void;
}) => {
  const isCompletedStep = isActive || (label !== 'Complete' && currentTab === 'Complete');

  return (
    <TouchableOpacity 
      style={styles.stepIndicatorContainer}
      onPress={onPress}
    >
      <View style={[
        styles.stepIcon,
        isActive && styles.stepIconActive,
        isCompletedStep && styles.stepIconCompleted
      ]}>
        <MaterialCommunityIcons 
          name={isCompletedStep ? 'check-circle' : icon} 
          size={24} 
          color={isCompletedStep ? '#fff' : (isActive ? '#009DC4' : '#666')} 
        />
      </View>
      <ThemedText style={[
        styles.stepLabel,
        isActive && styles.stepLabelActive,
        isCompletedStep && styles.stepLabelCompleted
      ]}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
};

const JobHeader = () => {

  return (
    <View style={jobHeaderStyles.container}>
      <NavigationHeader
        title="Job Details"
        showBackButton={true}
      />  

      {/* <TouchableOpacity 
        onPress={() => {
          if (canGoBack) {
            router.back();
          } else {
            // If we can't go back, navigate to the assigned jobs tab
            router.replace('/assigned');
          }
        }} 
        style={jobHeaderStyles.backButton}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color="#009DC4" />
        <ThemedText style={jobHeaderStyles.backText}>Back to Jobs</ThemedText>
      </TouchableOpacity> */}
      <GuideButton
        title="Help"
        steps={[
          {
            target: 'progress-steps',
            title: 'Progress Steps',
            description: 'Follow the steps from Details to Complete to process your job. Steps become available after starting the job.'
          },
          {
            target: 'details-section',
            title: 'Job Information',
            description: 'View customer details, location, equipment, and job requirements'
          },
          {
            target: 'navigation',
            title: 'Navigation',
            description: 'Get directions to the job site and view the location on the map'
          },
          {
            target: 'service',
            title: 'Service Checklist',
            description: 'Complete required service tasks and add notes or photos'
          },
          {
            target: 'completion',
            title: 'Job Completion',
            description: 'Submit final documentation and complete the job'
          }
        ]}
      />
    </View>
  );
};

export default function JobDetailsScreen() {
  const { id, workerId, jobData } = useLocalSearchParams();
  const [job, setJob] = useState<Job | null>(jobData ? JSON.parse(jobData as string) : null);
  const [loading, setLoading] = useState(!jobData);
  const [activeTab, setActiveTab] = useState<TabType>('Details');
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [distance, setDistance] = useState<string>('Calculating...');
  const [eta, setEta] = useState<string>('Calculating...');
  const [stepProgress, setStepProgress] = useState<StepProgress>({
    Details: false,
    Navigate: false,
    Service: false,
    Complete: false,
  });
  const [dialogVisible, setDialogVisible] = useState(false);
  const router = useRouter();
  const navigation = useNavigation();
  const [isOffline, setIsOffline] = useState(false);
  

  const isJobStarted = job?.jobStatus === 'In Progress';

  // Add network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Modify job fetching to support offline mode
  useEffect(() => {
    if (!jobData && id) {
      const fetchJob = async () => {
        try {
          setLoading(true);
          
          // Try to get cached job data first
          const cachedJob = await AsyncStorage.getItem(`job_${id}`);
          if (cachedJob) {
            setJob(JSON.parse(cachedJob));
          }

          if (!isOffline) {
            // If online, fetch fresh data
            const jobData = await getJob(id as string);
            setJob(jobData);
            // Cache the fresh data
            await AsyncStorage.setItem(`job_${id}`, JSON.stringify(jobData));
          }
        } catch (error) {
          console.error('Error fetching job:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchJob();
    }
  }, [id, jobData, isOffline]);

  // Location tracking effect
  useEffect(() => {
    let locationSubscription: any;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      // Get initial location
      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);

      // Subscribe to location updates
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setCurrentLocation(newLocation);
        }
      );
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const handleStepPress = (tab: TabType) => {
    if (job?.jobStatus === 'Completed') {
      Alert.alert(
        'Job Completed',
        'This job has been completed and cannot be modified.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // If navigating away from Navigate tab, safely clear the route data
      if (activeTab === 'Navigate' && tab !== 'Navigate') {
        setRouteCoordinates([]);
        setDistance('Calculating...');
        setEta('Calculating...');
      }

      // Allow access to Details tab always
      if (tab === 'Details') {
        setActiveTab(tab);
        return;
      }

      // Check if job exists
      if (!job) {
        Alert.alert('Error', 'Job data not available');
        return;
      }

      // Check if current worker is in progress
      const currentWorker = job?.assignedWorkers?.find(
        worker => worker.workerId === workerId
      );

      const isWorkerInProgress = currentWorker?.workerStatus === 'In Progress';

      if (!isWorkerInProgress) {
        Alert.alert(
          "Action Required",
          "Please start the job first before accessing other sections.",
          [{ text: "OK" }]
        );
        return;
      }

      // Allow Complete tab only after Service is completed
      if (tab === 'Complete' && !stepProgress.Service) {
        Alert.alert(
          "Action Required",
          "Please complete the service section first.",
          [{ text: "OK" }]
        );
        return;
      }

      setActiveTab(tab);
    } catch (error) {
      console.error('Error in handleStepPress:', error);
      Alert.alert('Error', 'Failed to switch tabs. Please try again.');
    }
  };

  const handleStartJob = async () => {
    if (!isUserAssigned()) {
      setDialogVisible(true);
      return;
    }

    try {
      setLoading(true);
      
      if (isOffline) {
        // Queue the start job action for later
        const queuedActions = await AsyncStorage.getItem('queuedActions') || '[]';
        const actions = JSON.parse(queuedActions);
        actions.push({
          type: 'START_JOB',
          jobId: id,
          timestamp: Date.now()
        });
        await AsyncStorage.setItem('queuedActions', JSON.stringify(actions));
        
        // Update local state
        setJob(prev => ({
          ...prev!,
          jobStatus: JobStatus.InProgress
        }));
      } else {
        // Online flow remains the same
        await updateJobStatus(id as string, JobStatus.InProgress);
        const updatedJob = await getJob(id as string);
        setJob(updatedJob);
      }

      setStepProgress(prev => ({
        ...prev,
        Details: true,
        Navigate: true
      }));

      Alert.alert(
        "Job Started",
        isOffline ? 
          "Job started in offline mode. Changes will sync when online." : 
          "You can now proceed to the Navigation screen",
        [{ text: "OK", onPress: () => setActiveTab('Navigate') }]
      );

    } catch (error) {
      console.error('Error starting job:', error);
      Alert.alert("Error", "Failed to start the job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isUserAssigned = () => {
    //console.log('Current workerId from params:', workerId);
    //console.log('Assigned workers:', job?.assignedWorkers);
    
    return job?.assignedWorkers?.some(worker => worker.workerId === workerId);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const refreshedJob = await getJob(id as string);
      setJob(refreshedJob);
    } catch (error) {
      console.error('Error refreshing job:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicators = () => (
    <View style={styles.stepsContainer}>
      <StepIndicator 
        label="Details" 
        icon="clipboard-text"
        isActive={activeTab === 'Details'}
        currentTab={activeTab}
        onPress={() => handleStepPress('Details')}
      />
      <View style={[
        styles.stepDivider,
        stepProgress.Details && styles.stepDividerCompleted
      ]} />
      <StepIndicator 
        label="Navigate" 
        icon="navigation"
        isActive={activeTab === 'Navigate'}
        currentTab={activeTab}
        onPress={() => handleStepPress('Navigate')}
      />
      <View style={[
        styles.stepDivider,
        stepProgress.Navigate && styles.stepDividerCompleted
      ]} />
      <StepIndicator 
        label="Service" 
        icon="wrench"
        isActive={activeTab === 'Service'}
        currentTab={activeTab}
        onPress={() => handleStepPress('Service')}
      />
      <View style={[
        styles.stepDivider,
        stepProgress.Service && styles.stepDividerCompleted
      ]} />
      <StepIndicator 
        label="Complete" 
        icon="check-circle"
        isActive={activeTab === 'Complete'}
        currentTab={activeTab}
        onPress={() => handleStepPress('Complete')}
      />
    </View>
  );

  const renderContent = () => {
    if (loading || !job) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#009DC4" />
        </View>
      );
    }

    switch (activeTab) {
      case 'Details':
        return (
          <ScrollView style={styles.scrollView}>
            <DetailsScreen 
              job={job} 
              onStartJob={handleStartJob}
              onRefresh={handleRefresh}
            />
          </ScrollView>
        );
      case 'Navigate':
        return (
          <NavigateScreen 
            job={job}
            currentLocation={currentLocation}
          />
        );
      case 'Service':
        return job ? (
          <ServiceScreen 
            job={job} 
            workerId={workerId as string}
            onComplete={() => setStepProgress(prev => ({ ...prev, Service: true }))}
          />
        ) : null;
      case 'Complete':
        return job ? (
          <CompleteScreen 
            job={job} 
            workerId={workerId as string}
            onComplete={() => setStepProgress(prev => ({ ...prev, Complete: true }))}
          />
        ) : null;
      default:
        return job ? <DetailsScreen job={job} /> : null;
    }
  };

  const showUnauthorizedDialog = () => (
    <Dialog.Container visible={dialogVisible}>
      <Dialog.Title>Unauthorized Action</Dialog.Title>
      <Dialog.Description>
        You are not assigned to this job. Only assigned workers can start this job.
      </Dialog.Description>
      <Dialog.Button label="OK" onPress={() => setDialogVisible(false)} />
    </Dialog.Container>
  );

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <JobHeader />
        {renderStepIndicators()}
        {renderContent()}
        {showUnauthorizedDialog()}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    zIndex: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
  },
  jobTime: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  priorityText: {
    color: '#FF4D4F',
    fontSize: 14,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    color: '#666',
  },
  detailCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  cardContent: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
  },
  description: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  equipmentList: {
    gap: 12,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  equipmentText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  footerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  stepIndicatorContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stepIconActive: {
    backgroundColor: '#E6F7FB',
    borderColor: '#009DC4',
  },
  stepIconCompleted: {
    backgroundColor: '#009DC4',
    borderColor: '#009DC4',
  },
  stepIconDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  stepLabelActive: {
    color: '#009DC4',
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: '#009DC4',
    fontWeight: '600',
  },
  stepLabelDisabled: {
    color: '#999',
  },
  stepDivider: {
    height: 2,
    backgroundColor: '#E0E0E0',
    width: 24,
    marginTop: -20,
  },
  stepDividerCompleted: {
    backgroundColor: '#009DC4',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenContainer: {
    flex: 1,
    padding: 16,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#009DC4',
    padding: 16,
    borderRadius: 8,
    gap: 12,
    marginBottom: 16,
  },
  navigationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addressContainer: {
    marginTop: 16,
  },
  addressLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  checkbox: {
    padding: 4,
  },
  checklistText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  startedButton: {
    backgroundColor: '#52C41A',
  },
  stepIndicatorDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const jobHeaderStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 18,
    color: '#009DC4',
    fontWeight: '500',
  }
});