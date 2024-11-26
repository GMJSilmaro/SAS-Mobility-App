import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Job } from '../../../src/types/job';
import { db, storage } from '@/src/config/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import SignatureScreen from 'react-native-signature-canvas';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { Modal } from 'react-native';
import Collapsible from 'react-native-collapsible';
import { router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CompleteScreenProps {
  job: Job;
  onComplete?: () => void;
  workerId: string;
}

export const CompleteScreen = ({ job, onComplete, workerId }: CompleteScreenProps) => {
  const [techSignature, setTechSignature] = useState<string | null>(null);
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signaturePad, setSignaturePad] = useState<any>(null);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [serviceImages, setServiceImages] = useState<any[]>([]);
  const [isTasksCollapsed, setIsTasksCollapsed] = useState<boolean>(false);
  const [isImagesCollapsed, setIsImagesCollapsed] = useState<boolean>(false);
  const [isSignaturesCollapsed, setIsSignaturesCollapsed] = useState<boolean>(false);
  const [isEquipmentsCollapsed, setIsEquipmentsCollapsed] = useState<boolean>(false);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading job details...');
  const [isOffline, setIsOffline] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetchJobData();
    console.log("jobID on CompleteScreen: ",job.jobID);
  }, [job.jobID]);

  useEffect(() => {
    const fetchTechSignature = async () => {
      try {
        const techSigRef = query(
          collection(db, `jobs/${job.jobID}/signatures`),
          where('type', '==', 'technician')
        );
        const techSigSnap = await getDocs(techSigRef);
        if (!techSigSnap.empty) {
          setTechSignature(techSigSnap.docs[0].data().signatureURL);
        }
      } catch (error) {
        console.error('Error fetching tech signature:', error);
      }
    };

    fetchTechSignature();
  }, [job.jobID]);

  useEffect(() => {
    const fetchCustomerSignature = async () => {
      try {
        const custSigRef = doc(db, `jobs/${job.jobID}/signatures`, `customer-${workerId}`);
        const custSigDoc = await getDoc(custSigRef);
        
        if (custSigDoc.exists()) {
          setCustomerSignature(custSigDoc.data().signatureURL);
        }
      } catch (error) {
        console.error('Error fetching customer signature:', error);
      }
    };

    fetchCustomerSignature();
  }, [job.jobID, workerId]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const fetchJobData = async () => {
    try {
      setIsInitialLoading(true);
      setLoadingMessage('Loading job details...');

      // Try to fetch data regardless of network status
      // Remove the network check entirely and rely on Firebase's offline persistence

      // Fetch technician signature
      setLoadingMessage('Loading signatures...');
      const techSigRef = query(
        collection(db, `jobs/${job.jobID}/signatures`),
        where('type', '==', 'technician')
      );
      const techSigSnap = await getDocs(techSigRef);
      if (!techSigSnap.empty) {
        setTechSignature(techSigSnap.docs[0].data().signatureURL);
      }

      // Fetch customer signature
      const custSigRef = doc(db, `jobs/${job.jobID}/signatures`, `customer-${workerId}`);
      const custSigDoc = await getDoc(custSigRef);
      if (custSigDoc.exists()) {
        setCustomerSignature(custSigDoc.data().signatureURL);
      }

      // Fetch completed tasks
      setLoadingMessage('Loading tasks...');
      const completedTasks = job.taskList?.filter(task => task.isDone) || [];
      setCompletedTasks(completedTasks);

      // Fetch service images
      setLoadingMessage('Loading images...');
      const imagesRef = collection(db, `jobs/${job.jobID}/images`);
      const imagesSnap = await getDocs(imagesRef);
      setServiceImages(imagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Set equipment from job data
      setLoadingMessage('Loading equipment...');
      setEquipments(job.equipments || []);

    // ... existing code ...
  } catch (error: any) {  // Type the error as 'any' or use a more specific type
    console.error('Error fetching job data:', error);
    Alert.alert(
      'Error',
      'Failed to load job details. Please try again.'
    );

    } finally {
      setIsInitialLoading(false);
    }
  };

    // Add this webStyle configuration at the top of the component
    const webStyle = `.m-signature-pad {
      width: 100%;
      height: 100%;
      margin: 0;
    }
    .m-signature-pad--body {
      border: none;
    }
    .m-signature-pad--footer {
      display: none;
    }
    canvas {
      width: 100%;
      height: 100%;
    }
    `;
  

  const handleSignature = async (signature: string) => {
    try {
      setIsSavingSignature(true);
      console.log('Starting signature save process...');

      // Check if signature already exists
      const sigRef = doc(db, `jobs/${job.jobID}/signatures`, `customer-${workerId}`);
      const sigDoc = await getDoc(sigRef);

      if (sigDoc.exists()) {
        Alert.alert(
          'Signature Exists',
          'Do you want to replace the existing signature?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setShowSignatureModal(false)
            },
            {
              text: 'Replace',
              style: 'destructive',
              onPress: async () => {
                await saveSignature(signature);
              }
            }
          ]
        );
      } else {
        await saveSignature(signature);
      }
    } catch (error) {
      console.error('Error handling signature:', error);
      Alert.alert('Error', 'Failed to save signature');
    } finally {
      setIsSavingSignature(false);
    }
  };

  const saveSignature = async (signature: string) => {
    try {
      const fileUri = `${FileSystem.documentDirectory}signature-customer-${job.jobID}-${workerId}.png`;
      const base64Data = signature.split('data:image/png;base64,')[1];
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch(fileUri);
      const blob = await response.blob();
      const filename = `signature_customer_${workerId}_${Date.now()}.png`;
      const storageRef = ref(storage, `jobs/${job.jobID}/signatures/${filename}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      const signatureData = {
        signatureURL: downloadURL,
        timestamp: new Date().toISOString(),
        type: 'customer',
        workerId: workerId
      };

      const sigRef = doc(db, `jobs/${job.jobID}/signatures`, `customer-${workerId}`);
      await setDoc(sigRef, signatureData);

      await FileSystem.deleteAsync(fileUri);
      
      setCustomerSignature(downloadURL);
      setShowSignatureModal(false);
      Alert.alert('Success', 'Signature saved successfully');

    } catch (error) {
      console.error('Error saving signature:', error);
      throw error;
    }
  };

  const handleCompleteJob = async () => {
    if (!customerSignature) {
      Alert.alert('Error', 'Customer signature is required');
      return;
    }

    if (!techSignature) {
      Alert.alert('Error', 'Technician signature is required');
      return;
    }

    setLoading(true);
    try {
      if (isOffline) {
        // Store completion data locally
        await AsyncStorage.setItem(`completion_${job.jobID}`, JSON.stringify({
          customerSignature,
          timestamp: Date.now(),
          workerId
        }));

        Alert.alert(
          'Job Completed Offline',
          'The job completion will be synced when you\'re back online',
          [{ text: 'OK' }]
        );
      } else {
        // Online completion logic
        const jobRef = doc(db, 'jobs', job.jobID);
        
        // Update job status and add completion details
        await updateDoc(jobRef, {
          status: 'completed',
          jobStatus: 'Completed',
          completedAt: new Date().toISOString(),
          completedBy: workerId,
          lastUpdated: new Date().toISOString(),
          completionDetails: {
            customerSignature,
            technicianSignature: techSignature,
            completedTasks,
            serviceImages,
            equipments
          }
        });

        Alert.alert(
          'Success',
          'Job completed successfully',
          [
            {
              text: 'OK',
              onPress: async () => {
                setRedirecting(true);
                onComplete?.();
                router.replace('/(tabs)/assigned');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error completing job:', error);
      Alert.alert('Error', 'Failed to complete job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add memoization for sections
  const renderSection = useCallback(({ 
    title, 
    icon, 
    count, 
    isCollapsed, 
    onToggle, 
    children 
  }: { 
    title: string; 
    icon: string; 
    count: number; 
    isCollapsed: boolean; 
    onToggle: () => void; 
    children: React.ReactNode 
  }) => (
    <View style={styles.sectionContainer}>
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <MaterialCommunityIcons name={icon as any} size={24} color="#009DC4" />
          <ThemedText style={styles.sectionTitle}>
            {title} {count > 0 ? `(${count})` : ''}
          </ThemedText>
        </View>
        <MaterialCommunityIcons 
          name={isCollapsed ? 'chevron-down' : 'chevron-up'} 
          size={24} 
          color="#666" 
        />
      </TouchableOpacity>
      <Collapsible 
        collapsed={isCollapsed} 
        duration={200}
        enablePointerEvents={true}
      >
        <View style={styles.sectionContent}>
          {children}
        </View>
      </Collapsible>
    </View>
  ), []);



  // Add this function near your other render functions
  const renderSignatureModal = () => (
    <Modal
      visible={showSignatureModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSignatureModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Customer Signature</ThemedText>
          </View>
          
          <View style={styles.signaturePadContainer}>
            <SignatureScreen
              ref={setSignaturePad}
              onOK={handleSignature}
              onEmpty={() => Alert.alert('Error', 'Please sign first')}
              webStyle={webStyle}
              autoClear={true}
              descriptionText="Sign above"
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                if (signaturePad) {
                  signaturePad.clearSignature();
                }
                setShowSignatureModal(false);
              }}
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={() => {
                if (signaturePad) {
                  signaturePad.readSignature();
                }
              }}
              disabled={isSavingSignature}
            >
              {isSavingSignature ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTasksSection = () => (
    <View style={styles.sectionContainer}>
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => setIsTasksCollapsed(!isTasksCollapsed)}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <MaterialCommunityIcons name="clipboard-check-outline" size={24} color="#009DC4" />
          <ThemedText style={styles.sectionTitle}>
            Completed Tasks ({completedTasks.length})
          </ThemedText>
        </View>
        <MaterialCommunityIcons 
          name={isTasksCollapsed ? 'chevron-down' : 'chevron-up'} 
          size={24} 
          color="#666" 
        />
      </TouchableOpacity>
      <Collapsible 
        collapsed={isTasksCollapsed} 
        duration={200}
      >
        <View style={styles.sectionContent}>
          {completedTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={24} color="#666" />
              <ThemedText style={styles.emptyStateText}>No completed tasks</ThemedText>
            </View>
          ) : (
            completedTasks.map((task, index) => (
              <View key={task.taskID || index} style={styles.taskItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                <View style={styles.taskContent}>
                  <ThemedText style={styles.taskText}>{task.taskName}</ThemedText>
                  {task.taskDescription && (
                    <ThemedText style={styles.taskDescription}>{task.taskDescription}</ThemedText>
                  )}
                  {task.completionDate && (
                    <ThemedText style={styles.taskMeta}>
                      Completed: {new Date(task.completionDate).toLocaleDateString('en-GB')}
                    </ThemedText>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </Collapsible>
    </View>
  );

  return (
    <ScrollView style={styles.screenContainer}>
      {isInitialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#009DC4" />
          <ThemedText style={styles.loadingText}>{loadingMessage}</ThemedText>
        </View>
      ) : (
        <View style={styles.detailCard}>
          {renderTasksSection()}

          {/* Images Section */}
          {renderSection({ 
            title: 'Service Images', 
            icon: 'image-multiple', 
            count: serviceImages.length, 
            isCollapsed: isImagesCollapsed, 
            onToggle: () => setIsImagesCollapsed(!isImagesCollapsed), 
            children: (
              <View style={styles.sectionContent}>
                <View style={styles.imageGrid}>
                  {serviceImages.map((image, index) => (
                    <Image key={index} source={{ uri: image.url }} style={styles.thumbnailImage} />
                  ))}
                </View>
              </View>
            )
          })}

          
          {/* Equipment Section */}
          {renderSection({ 
            title: 'Equipment Used', 
            icon: 'tools', 
            count: equipments.length, 
            isCollapsed: isEquipmentsCollapsed, 
            onToggle: () => setIsEquipmentsCollapsed(!isEquipmentsCollapsed), 
            children: (
              <View style={styles.sectionContent}>
                {equipments.map((equipment, index) => (
                  <View key={index} style={styles.equipmentItem}>
                    <MaterialCommunityIcons name="cube-outline" size={20} color="#009DC4" />
                    <View style={styles.equipmentDetails}>
                      <ThemedText style={styles.equipmentName}>{equipment.itemName}</ThemedText>
                      <ThemedText style={styles.equipmentInfo}>SN: {equipment.serialNo}</ThemedText>
                      <ThemedText style={styles.equipmentInfo}>Location: {equipment.equipmentLocation}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )
          })}

          {/* Signatures Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="pen" size={24} color="#009DC4" />
              <ThemedText style={styles.sectionTitle}>Signatures</ThemedText>
            </View>

            {/* Technician Signature */}
            <View style={styles.signatureContainer}>
              <ThemedText style={styles.signatureLabel}>Technician Signature</ThemedText>
              {techSignature ? (
                <Image 
                  source={{ uri: techSignature }} 
                  style={styles.signatureImage} 
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.emptySignature}>
                  <ThemedText style={styles.emptySignatureText}>
                    Technician signature will be shown here
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Divider between signatures */}
            <View style={styles.signatureDivider} />

            {/* Customer Signature */}
            <View style={styles.signatureContainer}>
              <ThemedText style={styles.signatureLabel}>Customer Signature</ThemedText>
              {customerSignature ? (
                <Image 
                  source={{ uri: customerSignature }} 
                  style={styles.signatureImage} 
                  resizeMode="contain"
                />
              ) : (
                <TouchableOpacity 
                  style={styles.addSignatureButton}
                  onPress={() => setShowSignatureModal(true)}
                >
                  <MaterialCommunityIcons name="pen" size={24} color="#009DC4" />
                  <ThemedText style={styles.addSignatureText}>
                    Collect Customer Signature
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Complete Button */}
          <TouchableOpacity 
            style={[
              styles.completeButton, 
              (!customerSignature || loading) && styles.buttonDisabled
            ]}
            onPress={handleCompleteJob}
            disabled={!customerSignature || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="check-circle" size={24} color="white" />
                <ThemedText style={styles.completeButtonText}>Complete Job</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {renderSignatureModal()}

      {redirecting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#009DC4" />
          <ThemedText style={styles.redirectingText}>
            Redirecting to Job List...
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    backgroundColor: '#fff',
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
  summarySection: {
    marginBottom: 24,
  },
  // sectionTitle: {
  //   fontSize: 16,
  //   fontWeight: '500',
  //   color: '#2C3E50',
  // },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  taskText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  taskDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  taskMeta: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  thumbnailImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
  signatureContainer: {
    marginVertical: 12,
  },
  signatureLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  addSignatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#009DC4',
    borderRadius: 8,
    borderStyle: 'dashed',
    gap: 8,
  },
  addSignatureText: {
    color: '#009DC4',
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 500,
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  signaturePadContainer: {
    width: '100%',
    height: 300,
    backgroundColor: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#009DC4',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  signatureImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#009DC4',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 32,
    gap: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // sectionHeader: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'space-between',
  //   padding: 16,
  //   backgroundColor: '#F8F9FA',
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#E0E0E0',
  // },
  // headerContent: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   gap: 12,
  // },
  // sectionContent: {
  //   padding: 16,
  //   backgroundColor: 'white',
  // },

  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  equipmentDetails: {
    flex: 1,
  },
  equipmentName: {
    fontSize: 14,
    color: '#2C3E50',
  },
  equipmentInfo: {
    fontSize: 12,
    color: '#666',
  },
  signatureDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
    marginHorizontal: 16,
  },
  emptySignature: {
    height: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
  },
  emptySignatureText: {
    color: '#666',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionContainer: {
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  sectionContent: {
    padding: 16,
    backgroundColor: 'white',
  },
  taskContent: {
    flex: 1,
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  redirectingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#009DC4',
  },
}); 