import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, Image, Text, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useAuth } from '@/src/hooks/useAuth';
import { Job } from '@/src/types/job';
import { JobCard } from '@/src/components/JobCard';
import { useLocalSearchParams } from 'expo-router';
import { getJobs } from '@/src/services/jobService';
import { ScreenHeader } from '@/src/components/common/ScreenHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getStatusColor } from '@/src/utils/jobUtils';
import { ThemedText } from '@/src/components/ThemedText';
import { GuideButton } from '@/src/components/common/GuideButton';

const renderJobCard = (job: Job, workerId: string) => {
  const statusColor = getStatusColor(job.jobStatus);

  return (
    <TouchableOpacity
      key={job.jobID}
      style={[styles.jobCard, { borderLeftColor: statusColor.text }]}
      onPress={() => router.push({
        pathname: `/job/[id]` as const,
        params: { id: job.jobID, workerId: workerId }
      })}
    >
      <View style={styles.jobHeader}>
        <View style={styles.jobHeaderLeft}>
          <MaterialCommunityIcons name="file-document-outline" size={18} color={statusColor.text} />
          <ThemedText style={styles.jobTitle}>{job.jobNo}</ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <ThemedText style={[styles.statusText, { color: statusColor.text }]}>{job.jobStatus}</ThemedText>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
          <ThemedText style={styles.detailText}>
            {job.startTime} - {job.endTime}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="domain" size={16} color="#666" />
          <ThemedText style={styles.detailText} numberOfLines={1}>
            {job.customerName}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={16} color="#666" />
          <ThemedText style={styles.detailText} numberOfLines={1}>
            {job.location.locationName}
          </ThemedText>
        </View>

        {job.equipments && job.equipments[0] && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="tools" size={16} color="#666" />
            <ThemedText style={styles.detailText} numberOfLines={1}>
              {job.equipments[0].itemName}
            </ThemedText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const SearchBar = ({ onSearch }: { onSearch: (text: string) => void }) => (
  <View style={styles.searchContainer}>
    <MaterialCommunityIcons name="magnify" size={20} color="#666" />
    <TextInput
      style={styles.searchInput}
      placeholder="Search jobs..."
      onChangeText={onSearch}
      placeholderTextColor="#666"
    />
  </View>
);

const CurrentJobsTab = ({ jobs, workerId, onRefresh }: { 
  jobs: Job[], 
  workerId: string,
  onRefresh?: () => Promise<void>
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const searchLower = searchQuery.toLowerCase();
    return (
      job.jobNo.toLowerCase().includes(searchLower) ||
      job.customerName.toLowerCase().includes(searchLower) ||
      job.location.locationName.toLowerCase().includes(searchLower)
    );
  });

  return (
    <View style={styles.tabContent}>
      <SearchBar onSearch={setSearchQuery} />
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#009DC4']}
            tintColor="#009DC4"
          />
        }
      >
        {filteredJobs.length === 0 ? (
          <View style={styles.centered}>
            <Text>No current jobs found</Text>
          </View>
        ) : (
          <>
            {filteredJobs.map(job => renderJobCard(job, workerId))}
            <View style={styles.bottomSpacing} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

const HistoryJobsTab = ({ jobs, workerId, onRefresh }: { 
  jobs: Job[], 
  workerId: string,
  onRefresh?: () => Promise<void>
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (job.jobNo?.toLowerCase() || '').includes(searchLower) ||
      (job.customerName?.toLowerCase() || '').includes(searchLower) ||
      (job.location?.locationName?.toLowerCase() || '').includes(searchLower)
    );
  });

  return (
    <View style={styles.tabContent}>
      <SearchBar onSearch={setSearchQuery} />
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#009DC4']}
            tintColor="#009DC4"
          />
        }
      >
        {filteredJobs.length === 0 ? (
          <View style={styles.centered}>
            <Text>No history jobs found</Text>
          </View>
        ) : (
          <>
            {filteredJobs.map(job => renderJobCard(job, workerId))}
            <View style={styles.bottomSpacing} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default function AssignedScreen() {
  const [index, setIndex] = useState(1);
  const [routes] = useState([
    { key: 'history', title: 'History' },
    { key: 'current', title: 'Current Jobs' },
  ]);
  const [assignedJobs, setAssignedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { workerId } = useLocalSearchParams<{ workerId: string }>();

  useEffect(() => {
    fetchAssignedJobs();
  }, [workerId]);

  const fetchAssignedJobs = async () => {
    if (!workerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const jobs = await getJobs(workerId);
      
      const filtered = jobs.filter(job => {
        return job.assignedWorkers && 
               Array.isArray(job.assignedWorkers) &&
               job.assignedWorkers.some(worker => worker.workerId === workerId);
      });
      
      setAssignedJobs(filtered);
    } catch (error) {
      console.error('Error fetching assigned jobs:', error);
      Alert.alert(
        "Error",
        "Failed to load jobs. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchAssignedJobs();
    Alert.alert(
      "Jobs Updated",
      "Your job list has been refreshed",
      [{ text: "OK" }]
    );
  };

  const getCurrentJobs = () => {
    const today = new Date();
    return assignedJobs.filter(job => {
      const jobDate = new Date(job.startDate); 
      return jobDate >= today;
    });
  };

  const getHistoryJobs = () => {
    const today = new Date();
    return assignedJobs.filter(job => {
      const jobDate = new Date(job.startDate);
      return jobDate < today;
    });
  };

  const renderScene = SceneMap({
    history: () => <HistoryJobsTab 
      jobs={getHistoryJobs()} 
      workerId={workerId} 
      onRefresh={handleRefresh}
    />,
    current: () => <CurrentJobsTab 
      jobs={getCurrentJobs()} 
      workerId={workerId} 
      onRefresh={handleRefresh}
    />,
  });

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={styles.indicator}
      style={styles.tabBar}
      labelStyle={styles.tabLabel}
      activeColor="#009DC4"
      inactiveColor="#666"
    />
  );

  if (!workerId) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>No worker ID found</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#009DC4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader 
        
        leftComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image 
              source={require('@/assets/images/SAS-LOGO.png')}
              style={styles.headerLogo}
            />
            <Text style={styles.headerTitle}>
              My Jobs
            </Text>
          </View>
        }
        rightComponent={
          <GuideButton
            title="Help"
            steps={[
              {
                target: 'tabs',
                title: 'Job Views',
                description: 'Switch between Current Jobs and History to view your assignments'
              },
              {
                target: 'search',
                title: 'Search Jobs',
                description: 'Search for jobs by job number, customer name, or location'
              },
              {
                target: 'job-card',
                title: 'Job Details',
                description: 'View job information including time, customer, location, and equipment'
              }
            ]}
          />
        }
      />

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={renderTabBar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
  },
  bottomSpacing: {
    height: 80,
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

  tabBar: {
    backgroundColor: 'white',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  indicator: {
    backgroundColor: '#009DC4',
    height: 3,
  },
  tabLabel: {
    fontWeight: '600',
    textTransform: 'none',
  },
  jobCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  jobHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  jobDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#000',
  },
}); 