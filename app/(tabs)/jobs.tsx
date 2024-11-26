import React, { useState, useCallback, useEffect } from 'react';
import { Alert, StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Agenda, DateData, AgendaEntry, AgendaSchedule } from 'react-native-calendars';
import testIDs from '../../src/types/testIDs';
import { ScreenHeader } from '@/src/components/common/ScreenHeader';
import { Job, JobStatus } from '@/src/types/job';
import { getStatusColor } from '@/src/utils/jobUtils';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/src/config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/ThemedText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';

// Enhanced Empty Date Component
const EmptyDate = React.memo(({ isLoading }: { isLoading: boolean }) => {
  if (isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#666" />
        <Text style={styles.emptySubText}>Loading jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="calendar-blank" size={50} color="#ccc" />
      <Text style={styles.emptyMainText}>No Scheduled Jobs</Text>
      <Text style={styles.emptySubText}>There are no jobs scheduled for this date</Text>
    </View>
  );
});

// Enhanced JobCard with icons
const JobCard = React.memo(({ reservation, onPress }: { 
  reservation: AgendaEntry & Job, 
  onPress: () => void 
}) => {
  const statusColors = getStatusColor(reservation.jobStatus);
  
  // Handle location display without hooks
  const locationDisplay = (() => {
    const location = reservation.location || {};
    const address = location.address || {};
    const buildingNo = address.buildingNo ? `#${address.buildingNo} ` : '';
    const fullAddress = location.locationName || 'No address available';
    return `${buildingNo}${fullAddress}`;
  })();

  return (
    <TouchableOpacity
      testID={testIDs.agenda.ITEM}
      style={[styles.jobCard, { borderLeftColor: statusColors.text }]}
      onPress={onPress}
    >
      <View style={styles.jobContent}>
        <View style={styles.jobHeader}>
          <View style={styles.jobIdContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={16} color="#666" />
            <Text style={styles.jobIdText}>Job {reservation.jobNo}</Text>
          </View>
          <View style={styles.timeContainer}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#666" />
            <Text style={styles.timeText}>{reservation.startTime}</Text>
          </View>
        </View>

        <Text style={styles.jobTitle}>{reservation.jobName}</Text>
        
        <View style={styles.companyContainer}>
          <MaterialCommunityIcons name="office-building" size={16} color="#666" />
          <Text style={styles.companyName}>{reservation.customerName}</Text>
        </View>

        <View style={styles.locationContainer}>
          <MaterialCommunityIcons name="map-marker-outline" size={16} color="#666" />
          <Text style={styles.location} numberOfLines={2}>
            {locationDisplay}
          </Text>
        </View>

        <View style={styles.jobFooter}>
          <View style={styles.timeRangeContainer}>
            <MaterialCommunityIcons name="clock-time-four-outline" size={16} color="#666" />
            <Text style={styles.timeRangeText}>
              {`${reservation.startTime} - ${reservation.endTime}`}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {reservation.jobStatus}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const AgendaScreen = () => {
  const [items, setItems] = useState<AgendaSchedule>();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { workerId } = useLocalSearchParams<{ workerId: string }>();

  useEffect(() => {
    loadInitialJobs();
  }, []);

  const loadInitialJobs = async () => {
    try {
      setIsLoading(true);
      const jobsRef = collection(db, 'jobs');
      const jobsSnapshot = await getDocs(query(jobsRef));
      
      const newItems: AgendaSchedule = {};
      
      jobsSnapshot.forEach((doc) => {
        const job = doc.data() as Job;
        const dateStr = job.startDate.split('T')[0];
        
        if (!newItems[dateStr]) {
          newItems[dateStr] = [];
        }
        
        newItems[dateStr].push({
          ...job,
          height: 100,
          day: dateStr,
          name: job.jobName
        });
      });

      setItems(newItems);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = useCallback((reservation: AgendaEntry & Job, isFirst: boolean) => {
    const handlePress = () => {
      const currentWorker = reservation.assignedWorkers?.find(
        worker => worker.workerId === workerId
      );

      router.push({
        pathname: `/job/[id]`,
        params: { 
          id: reservation.jobID,
          workerId: workerId || ''
        }
      });
    };

    return (
      <JobCard 
        reservation={reservation}
        onPress={handlePress} 
      />
    );
  }, [router, workerId]);

  const renderEmptyDate = useCallback(() => {
    return <EmptyDate isLoading={isLoading} />;
  }, [isLoading]);

  const rowHasChanged = useCallback((r1: AgendaEntry & Job, r2: AgendaEntry & Job) => {
    return (
      r1.jobID !== r2.jobID ||
      r1.jobStatus !== r2.jobStatus ||
      r1.startTime !== r2.startTime ||
      r1.endTime !== r2.endTime
    );
  }, []);

  useEffect(() => {
    if (workerId) {
      console.log('Current workerId in jobs screen:', workerId);
    }
  }, [workerId]);

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <ScreenHeader  leftComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image 
              source={require('@/assets/images/SAS-LOGO.png')}
              style={styles.headerLogo}
            />
            <ThemedText style={styles.headerTitle}>
              Calendar
            </ThemedText>
          </View>
        } />
      <Agenda
        items={items || {}}
        selected={new Date().toISOString().split('T')[0]}
        renderItem={renderItem}
        renderEmptyDate={renderEmptyDate}
        rowHasChanged={rowHasChanged}
        showClosingKnob={true}
        renderEmptyData={() => (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-blank" size={50} color="#ccc" />
            <Text style={styles.emptyMainText}>No Scheduled Jobs</Text>
            <Text style={styles.emptySubText}>There are no jobs scheduled for this date</Text>
          </View>
        )}
        pastScrollRange={12}
        futureScrollRange={12}
        pagingEnabled={true}
        scrollEnabled={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={5}
      />
    </View>
  );
};

export default AgendaScreen;

const styles = StyleSheet.create({
  item: {
    backgroundColor: 'white',
    flex: 1,
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    marginTop: 17
  },
  emptyDate: {
    height: 15,
    flex: 1,
    paddingTop: 30
  },
  customDay: {
    margin: 10,
    fontSize: 24,
    color: 'green'
  },
  dayItem: {
    marginLeft: 34
  },
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobContent: {
    gap: 8,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobIdText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  companyName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  location: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    flex: 1,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },

  timeRangeText: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyMainText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  jobIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  companyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
  },
  headerLogo: {
    width: 100,
    height: 50,
    resizeMode: 'stretch'
   
  },
});