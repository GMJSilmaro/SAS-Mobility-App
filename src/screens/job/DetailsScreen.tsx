import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated, Linking, Alert, RefreshControl, LogBox } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Equipment, Job, JobStatus } from '@/src/types/job';
import { getStatusColor, getPriorityColor } from '@/src/utils/jobUtils';
import { useLocalSearchParams } from 'expo-router';
import { doc, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/src/config/firebase';
import { router } from 'expo-router';
import { checkUserClockInStatus } from '@/src/utils/attendanceUtils';
import RenderHtml, { defaultSystemFonts } from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import type { MixedStyleDeclaration, RenderHTMLProps } from 'react-native-render-html';

// Filter out specific warning messages
LogBox.ignoreLogs([
  'Warning: MemoizedTNodeRenderer:',
  'Warning: TNodeChildrenRenderer:'
]);

interface DetailsScreenProps {
  job: Job;
  onStartJob?: (updatedJob: Job) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

const EquipmentItem = ({ equipment }: { equipment: Equipment }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    Animated.timing(animation, {
      toValue: isExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={styles.equipmentItem}>
      <TouchableOpacity onPress={toggleExpand} style={styles.equipmentHeader}>
        <View style={styles.equipmentHeaderLeft}>
          <MaterialCommunityIcons name="cog" size={16} color="#666" />
          <ThemedText style={styles.equipmentName}>{equipment.itemName}</ThemedText>
        </View>
        <MaterialCommunityIcons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      <Animated.View style={{
        opacity: animation,
        maxHeight: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 200],
        }),
      }}>
        {isExpanded && (
          <View style={styles.equipmentContent}>
            <View style={styles.equipmentDetail}>
              <ThemedText style={styles.equipmentLabel}>Model:</ThemedText>
              <ThemedText style={styles.equipmentValue}>{equipment.modelSeries || 'N/A'}</ThemedText>
            </View>
            <View style={styles.equipmentDetail}>
              <ThemedText style={styles.equipmentLabel}>Serial No:</ThemedText>
              <ThemedText style={styles.equipmentValue}>{equipment.serialNo || 'N/A'}</ThemedText>
            </View>
            {equipment.notes && (
              <View style={styles.equipmentNotes}>
                <ThemedText style={styles.notesLabel}>Notes:</ThemedText>
                <ThemedText style={styles.notes}>{equipment.notes}</ThemedText>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const getWorkerStatusColor = (status: string) => {
  switch (status) {
    case 'In Progress':
      return {
        bg: '#FFA500',
        text: '#fff'
      };
    case 'Pending':
      return {
        bg: '#E3F2FD',
        text: '#2196F3'
      };
    case 'Completed':
      return {
        bg: '#E8F5E9',
        text: '#4CAF50'
      };
    default: // Pending
      return {
        bg: '#FAFAFA',
        text: '#757575'
      };
  }
};

// Define proper types for the worker
interface AssignedWorker {
  workerId: string;
  workerName: string;
  workerStatus?: 'Pending' | 'In Progress' | 'Completed';
  timeStarted?: string;
  isOnline?: boolean;
}

interface WorkerItemProps {
  worker: AssignedWorker;
  isCurrentUser?: boolean;
}

const WorkerItem = ({ 
  worker, 
  isCurrentUser = false 
}: WorkerItemProps) => {
  const [isOnline, setIsOnline] = useState(false);
  const statusColor = getWorkerStatusColor(worker.workerStatus || 'Pending');

  useEffect(() => {
    if (!worker.workerId) return;

    const userRef = doc(db, 'users', worker.workerId);
    
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      const userData = snapshot.data();
      setIsOnline(userData?.isOnline || false);
    });

    return () => unsubscribe();
  }, [worker.workerId]);

  return (
    <View style={[
      styles.workerItem,
      isCurrentUser && styles.workerItemCurrent
    ]}>
      <View style={[
        styles.workerIcon,
        isCurrentUser && styles.workerIconCurrent
      ]}>
        <MaterialCommunityIcons 
          name="account" 
          size={24} 
          color={isCurrentUser ? "#2196F3" : "#fff"} 
        />
      </View>
      <View style={styles.workerInfo}>
        <ThemedText style={[
          styles.workerName,
          isCurrentUser && styles.workerNameCurrent
        ]}>
          {worker.workerName} {isCurrentUser && "(You)"}
        </ThemedText>
        <ThemedText style={styles.workerId}>ID: {worker.workerId}</ThemedText>
        
        <View style={styles.workerMetaInfo}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <ThemedText style={[styles.statusBadgeText, { color: statusColor.text }]}>
              {worker.workerStatus || 'Pending'}
            </ThemedText>
          </View>
          <View style={styles.onlineStatus}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#757575' }]} />
            <ThemedText style={styles.statusText}>
              {isOnline ? 'Online' : 'Offline'}
            </ThemedText>
          </View>
        </View>

        {worker.timeStarted && (
          <ThemedText style={styles.timeStarted}>
            Started: {new Date(worker.timeStarted).toLocaleString()}
          </ThemedText>
        )}
      </View>
    </View>
  );
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const tagsStyles = {
  a: {
    textDecorationLine: 'none',
  },
};

function WebDisplay({ html }: { html: string }) {
  const { width: contentWidth } = useWindowDimensions();
  return (
    <RenderHtml
      contentWidth={contentWidth}
      source={{ html }}
      tagsStyles={tagsStyles as Record<string, MixedStyleDeclaration>}
    />
  );
}

export const DetailsScreen = ({ 
  job, 
  onStartJob,
  onRefresh 
}: DetailsScreenProps) => {
  const { workerId } = useLocalSearchParams();
  const statusColor = getStatusColor(job.jobStatus);
  const priorityColor = getPriorityColor(job.priority);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = React.useCallback(async () => {
    if (!onRefresh) return;
    
    try {
      setIsRefreshing(true);
      await onRefresh();
    } catch (error) {
      console.error('Error refreshing job details:', error);
      Alert.alert(
        'Refresh Failed',
        'Unable to refresh job details. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  const isUserAssigned = () => {
    return job?.assignedWorkers?.some(worker => worker.workerId === workerId);
  };

  const canStartJob = () => {
    return isUserAssigned() && 
           job.assignedWorkers.every(worker => worker.workerStatus !== 'In Progress') && 
           job.jobStatus !== 'Completed';
  };

  const handleStartJob = async () => {
    //console.log('Starting job with workerId:', workerId);
    if (!workerId || !job.jobNo) {
      Alert.alert(
        'Error',
        'Unable to start job. Missing required information.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check clock-in status
    const isClockIn = await checkUserClockInStatus(workerId as string);
    
    if (!isClockIn) {
      Alert.alert(
        'Clock In Required',
        'You need to clock in before starting any job.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Go to Clock In',
            onPress: () => {
              router.push('/profile');
            }
          }
        ]
      );
      return;
    }

    // Show confirmation alert before starting
    Alert.alert(
      'Start Job',
      'Are you sure you want to start this job?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Start',
          onPress: async () => {
            try {
              const jobRef = doc(db, 'jobs', job.jobNo);
              
              // Show loading alert
              Alert.alert(
                'Starting Job',
                'Please wait...'
              );

              const updatedWorkers = job.assignedWorkers.map(worker => {
                if (worker.workerId === workerId) {
                  //console.log('Updating status for worker:', worker.workerName);
                  return {
                    ...worker,
                    workerStatus: 'In Progress',
                    timeStarted: new Date().toISOString()
                  };
                }
                return worker;
              });

              await updateDoc(jobRef, {
                assignedWorkers: updatedWorkers
              });

              // Call the onStartJob callback
              if (onStartJob) {
                await onStartJob(job);
              }

            } catch (error) {
              // Show error alert
              Alert.alert(
                'Error',
                'Failed to start job. Please try again.',
                [{ text: 'OK' }]
              );
              console.error('Error updating job:', error);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#009DC4']}
            tintColor="#009DC4"
            title="Pull to refresh"
            titleColor="#757575"
          />
        }
      >
        {/* Job Header */}
        <View style={styles.header}>
          <View style={styles.leftColumn}>
            <View style={styles.jobNumberContainer}>
              <ThemedText style={styles.jobLabel}>Job Number</ThemedText>
              <ThemedText style={styles.jobNumber}>{job.jobNo}</ThemedText>
              {job.jobDescription && (
                <View style={styles.jobDescription}>
                  <WebDisplay html={job.jobDescription} />
                </View>
              )}
            </View>
            <View style={styles.badgesContainer}>
              <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
                <ThemedText style={[styles.badgeText, { color: statusColor.text }]}>{job.jobStatus}</ThemedText>
              </View>
              <View style={[styles.badge, { backgroundColor: priorityColor.bg }]}>
                <ThemedText style={[styles.badgeText, { color: priorityColor.text }]}>{job.priority}</ThemedText>
              </View>
            </View>
          </View>
          
          <View style={styles.rightColumn}>
            <View style={styles.jobMetaItem}>
              <MaterialCommunityIcons name="account" size={16} color="#666" />
              <ThemedText style={styles.jobMetaText}>
                Created by: {job.createdBy?.fullName || 'Unknown'}
              </ThemedText>
            </View>
            <View style={styles.jobMetaItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
              <ThemedText style={styles.jobMetaText}>
                Created: {new Date(job.createdAt?.seconds * 1000).toLocaleDateString('en-GB')}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Basic Info - Polished */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information" size={20} color="#009DC4" />
            <ThemedText style={styles.sectionTitle}>Basic Information</ThemedText>
          </View>
          <View style={styles.basicInfoContainer}>
            {/* Date and Time Row */}
            <View style={styles.dateTimeContainer}>
              <View style={[styles.basicInfoRow, styles.dateTimeItem]}>
                <View style={styles.basicInfoIcon}>
                  <MaterialCommunityIcons name="calendar" size={20} color="#009DC4" />
                </View>
                <View style={styles.basicInfoContent}>
                  <ThemedText style={styles.basicInfoLabel}>Date</ThemedText>
                  <ThemedText style={styles.basicInfoValue}>
                    {new Date(job.startDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </ThemedText>
                </View>
              </View>
              
              <View style={[styles.basicInfoRow, styles.dateTimeItem]}>
                <View style={styles.basicInfoIcon}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#009DC4" />
                </View>
                <View style={styles.basicInfoContent}>
                  <ThemedText style={styles.basicInfoLabel}>Time</ThemedText>
                  <ThemedText style={styles.basicInfoValue}>{`${job.startTime} - ${job.endTime}`}</ThemedText>
                </View>
              </View>
            </View>

            {/* Customer with WhatsApp */}
            <View style={styles.basicInfoRow}>
              <View style={styles.basicInfoIcon}>
                <MaterialCommunityIcons name="domain" size={20} color="#009DC4" />
              </View>
              <View style={[styles.basicInfoContent, styles.customerContent]}>
                <View style={styles.customerMainInfo}>
                  <ThemedText style={styles.basicInfoLabel}>Customer</ThemedText>
                  <ThemedText style={styles.basicInfoValue}>{job.customerName}</ThemedText>
                </View>
                <TouchableOpacity 
                  style={styles.whatsappButton}
                  onPress={() => job.contact.mobilePhone && Linking.openURL(`whatsapp://send?phone=${job.contact.mobilePhone}`)}
                >
                  <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Location */}
            <View style={styles.basicInfoRow}>
              <View style={styles.basicInfoIcon}>
                <MaterialCommunityIcons name="map-marker" size={20} color="#009DC4" />
              </View>
              <View style={styles.basicInfoContent}>
                <ThemedText style={styles.basicInfoLabel}>Location</ThemedText>
                <ThemedText style={styles.basicInfoValue}>{job.location.locationName}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Equipment Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="tools" size={20} color="#009DC4" />
            <ThemedText style={styles.sectionTitle}>Equipment</ThemedText>
          </View>
          {(!job.equipments || job.equipments.length === 0) ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="tools" size={24} color="#666" />
              <ThemedText style={styles.emptyStateText}>No Equipment Available</ThemedText>
            </View>
          ) : (
            job.equipments.map((equipment, index) => (
              <EquipmentItem key={index} equipment={equipment as Equipment} />
            ))
          )}
        </View>

          {/* Assigned Workers Section */}
          <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-group" size={20} color="#009DC4" />
            <ThemedText style={styles.sectionTitle}>Assigned Workers</ThemedText>
          </View>
          {job.assignedWorkers?.map((worker, index) => (
            <WorkerItem 
              key={index} 
              worker={{
                ...worker,
                isOnline: worker.isOnline || false,
                workerStatus: worker.workerStatus as 'Pending' | 'In Progress' | 'Completed'
              }}
              isCurrentUser={workerId === worker.workerId}
            />
          ))}
        </View>

        {/* Follow Ups Section */}
        {!job.followUps ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="history" size={20} color="#009DC4" />
              <ThemedText style={styles.sectionTitle}>Follow Ups</ThemedText>
            </View>
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="history" size={24} color="#666" />
              <ThemedText style={styles.emptyStateText}>No Follow Ups</ThemedText>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="history" size={20} color="#009DC4" />
              <ThemedText style={styles.sectionTitle}>Follow Ups</ThemedText>
            </View>
            {Object.values(job.followUps).map((followUp, index) => (
              <View key={followUp.id} style={styles.followUpItem}>
                <View style={styles.followUpHeader}>
                  <View style={styles.followUpType}>
                    <MaterialCommunityIcons 
                      name={followUp.type === 'Appointment' ? 'calendar-clock' : 'note-text'} 
                      size={16} 
                      color="#009DC4" 
                    />
                  </View>
                  <ThemedText style={styles.followUpDate}>{formatDate(followUp.createdAt)}</ThemedText>
                </View>
                <ThemedText style={styles.followUpTitle}>{followUp.jobName}</ThemedText>
                <ThemedText style={styles.followUpCustomer}>{followUp.customerName}</ThemedText>
                <ThemedText style={styles.followUpStatus}>{followUp.status}</ThemedText>
                <ThemedText style={styles.followUpPriority}>{followUp.priority}</ThemedText>
                <ThemedText style={styles.followUpNotes}>{followUp.notes}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Tasks Section */}
        {(!job.taskList || job.taskList.length === 0) ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="checkbox-marked" size={20} color="#009DC4" />
              <ThemedText style={styles.sectionTitle}>Tasks</ThemedText>
            </View>
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="checkbox-multiple-blank-outline" size={24} color="#666" />
              <ThemedText style={styles.emptyStateText}>No Tasks Available</ThemedText>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="checkbox-marked" size={20} color="#009DC4" />
              <ThemedText style={styles.sectionTitle}>Tasks</ThemedText>
            </View>
            {job.taskList.map((task, index) => (
              <View key={index} style={styles.taskItem}>
                <View style={styles.taskRow}>
                  <MaterialCommunityIcons 
                    name={task.isDone ? "checkbox-marked" : "checkbox-blank-outline"} 
                    size={20} 
                    color={task.isDone ? "#52C41A" : "#666"} 
                  />
                  <ThemedText style={styles.taskName}>{task.taskName}</ThemedText>
                  {task.isPriority && (
                    <MaterialCommunityIcons name="flag" size={16} color="#FF4D4F" />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        
        {/* Always show the action button with appropriate state */}
        <View style={styles.actionButtonContainer}>
          {isUserAssigned() ? (
            <TouchableOpacity 
              style={[
                styles.actionButton,
                { backgroundColor: canStartJob() ? '#009DC4' : '#cccccc' }
              ]}
              onPress={handleStartJob}
              disabled={!canStartJob()}
            >
              <MaterialCommunityIcons 
                name="play-circle"
                size={24} 
                color="#FFF" 
              />
              <ThemedText style={styles.actionButtonText}>
                {canStartJob() ? 'Start Job' : 'Job Already Started'}
              </ThemedText>
            </TouchableOpacity>
          ) : (
            <View style={[styles.actionButton, { backgroundColor: '#cccccc' }]}>
              <ThemedText style={styles.actionButtonText}>
                Not Assigned to Job
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  jobNumberContainer: {
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#009DC4',
    paddingLeft: 12,
  },
  jobLabel: {
    fontSize: 13,
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F5F5F5',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jobMetaText: {
    fontSize: 13,
    color: '#757575',
  },
  section: {
    marginTop: 1,
    backgroundColor: '#fff',
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  infoGrid: {
    padding: 20,
    gap: 24,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoItemFull: {
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#1A1A1A',
    marginTop: 4,
  },
  equipmentItem: {
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: '#F5F5F5',
    borderLeftWidth: 3,
    borderLeftColor: '#009DC4',
  },
  equipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  equipmentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  equipmentContent: {
    padding: 16,
    backgroundColor: '#fff',
  },
  equipmentName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  equipmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  equipmentLabel: {
    fontSize: 13,
    color: '#666',
    width: 80,
  },
  equipmentValue: {
    fontSize: 13,
    color: '#2C3E50',
    flex: 1,
  },
  equipmentNotes: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  notesLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  notes: {
    fontSize: 13,
    color: '#2C3E50',
    fontStyle: 'italic',
  },
  taskItem: {
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: '#F5F5F5',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskName: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  partItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  partName: {
    fontSize: 14,
    fontWeight: '500',
  },
  partDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  partQuantity: {
    fontSize: 13,
    color: '#666',
  },
  partNumber: {
    fontSize: 13,
    color: '#666',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workerItem: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: '#F5F5F5',
    borderLeftWidth: 3,
    borderLeftColor: '#009DC4',
  },
  workerItemCurrent: {
    backgroundColor: '#E3F2FD',
    borderLeftColor: '#2196F3',
  },
  workerIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#009DC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workerIconCurrent: {
    backgroundColor: '#E3F2FD',
  },
  workerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  workerName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  workerId: {
    fontSize: 13,
    color: '#757575',
  },
  emptyState: {
    margin: 20,
    padding: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  acceptJobContainer: {
    margin: 20,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  acceptJobButton: {
    margin: 20,
    backgroundColor: '#009DC4',
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  acceptJobButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  basicInfoContainer: {
    paddingVertical: 16,
  },
  basicInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#009DC4',
    marginVertical: 8,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
  },
  customerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerMainInfo: {
    flex: 1,
  },
  whatsappButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    marginLeft: 12,
  },
  basicInfoIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  basicInfoContent: {
    flex: 1,
  },
  basicInfoLabel: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  basicInfoValue: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
  },
  dateTimeItem: {
    flex: 1,
    marginHorizontal: 0,
  },
  workerNameCurrent: {
    color: '#2196F3',  // Match the current worker icon color
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#757575',
  },
  actionButtonContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  workerStatus: {
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  workerMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
  },
  timeStarted: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  jobDescription: {
    marginTop: 8,
  },
  followUpItem: {
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: '#F5F5F5',
  },
  followUpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  followUpType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followUpDate: {
    fontSize: 12,
    color: '#757575',
  },
  followUpTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  followUpCustomer: {
    fontSize: 13,
    color: '#757575',
  },
  followUpStatus: {
    fontSize: 12,
    color: '#757575',
  },
  followUpPriority: {
    fontSize: 12,
    color: '#757575',
  },
  followUpNotes: {
    fontSize: 13,
    color: '#2C3E50',
    fontStyle: 'italic',
  },
}); 