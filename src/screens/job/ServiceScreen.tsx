import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, TextInput, Modal, ActivityIndicator, Animated } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Job } from '../../../src/types/job';
import * as ImagePicker from 'expo-image-picker';
import SignatureScreen from 'react-native-signature-canvas';
import { storage, db } from '@/src/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, updateDoc, doc, query, onSnapshot, deleteDoc, getDocs, where, setDoc, getDoc, arrayUnion } from 'firebase/firestore';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import { Equipment } from '@/src/types/job';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ServiceScreenProps {
  job: Job;
  onComplete?: () => void;
  workerId: string;
}

// Add this interface for task type
interface Task {
  taskID: string;
  taskName: string;
  taskDescription: string;
  isDone: boolean;
  isPriority: boolean;
  completionDate: string | null;
  completedBy?: string;
}

// Add interfaces for better type safety
interface ServiceImage {
  id: string;
  url: string;
  description: string;
  timestamp: string;
  uploadedBy: string;
}

export const ServiceScreen = ({ job, onComplete, workerId }: ServiceScreenProps) => {
  const [tasks, setTasks] = useState<Task[]>(job.taskList || []);
  const [images, setImages] = useState<ServiceImage[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>(job.equipments || []);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tasks: job.taskList || [],
    equipments: job.equipments || [],
    images: [],
    signature: null as string | null
  });
  const [signaturePad, setSignaturePad] = useState<any>(null);
  const [existingSignature, setExistingSignature] = useState<string | null>(null);
  const [tempImages, setTempImages] = useState<Array<{ uri: string }>>([]);
  const [isAddingDescription, setIsAddingDescription] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Add this useEffect to fetch existing signature when component mounts
  useEffect(() => {
    const fetchTechSignature = async () => {
      try {
        // Check for existing signature using the tech-{workerId} document ID
        const sigRef = doc(db, `jobs/${job.jobID}/signatures`, `tech-${workerId}`);
        const sigDoc = await getDoc(sigRef);
        
        if (sigDoc.exists()) {
          console.log('Found existing signature');
          setSignature(sigDoc.data().signatureURL);
        }
      } catch (error) {
        console.error('Error fetching signature:', error);
      }
    };

    fetchTechSignature();
  }, [job.jobID, workerId]);

  // Updated signature handling
  const handleSignature = async (signature: string) => {
    try {
      setIsSubmitting(true);
      console.log('Starting signature save process...');

      // Check if signature already exists
      const sigRef = doc(db, `jobs/${job.jobID}/signatures`, `tech-${workerId}`);
      const sigDoc = await getDoc(sigRef);

      if (sigDoc.exists()) {
        // If signature exists, show confirmation dialog
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
        // If no existing signature, save directly
        await saveSignature(signature);
      }
    } catch (error) {
      console.error('Error handling signature:', error);
      Alert.alert('Error', 'Failed to save signature');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Separate the signature saving logic
  const saveSignature = async (signature: string) => {
    try {
      // Create temporary file
      const fileUri = `${FileSystem.documentDirectory}signature-${job.jobID}.png`;
      const base64Data = signature.split('data:image/png;base64,')[1];
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create blob from file
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const filename = `signature_${Date.now()}.png`;
      const storageRef = ref(storage, `jobs/${job.jobID}/signatures/${filename}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Create signature data
      const signatureData = {
        signatureURL: downloadURL,
        timestamp: new Date().toISOString(),
        signedBy: workerId,
        type: 'technician'
      };

      // Save with specific document ID
      const sigRef = doc(db, `jobs/${job.jobID}/signatures`, `tech-${workerId}`);
      await setDoc(sigRef, signatureData);

      // Cleanup
      await FileSystem.deleteAsync(fileUri);
      
      setSignature(downloadURL);
      setShowSignatureModal(false);
      Alert.alert('Success', 'Signature saved successfully');

    } catch (error) {
      throw error; // Re-throw to be caught by the parent handler
    }
  };

  // Handle final submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate tasks array
      const updatedTasks = tasks.map(task => ({
        taskID: task.taskID,
        taskName: task.taskName,
        taskDescription: task.taskDescription || '',
        isDone: Boolean(task.isDone),
        isPriority: Boolean(task.isPriority),
        completionDate: task.completionDate || null,
        completedBy: task.completedBy || null
      }));

      // Validate equipment array
      const validEquipments = equipments.map(eq => ({
        serialNo: eq.serialNo || '',
        itemName: eq.itemName || '',
        modelSeries: eq.modelSeries || '',
        status: eq.status || 'available',
        notes: eq.notes || '',
        lastUpdated: eq.lastUpdated || new Date().toISOString(),
        lastUpdatedBy: eq.lastUpdatedBy || workerId
      }));

      // Prepare the update data with only defined values
      const updateData = {
        taskList: updatedTasks,
        equipments: validEquipments,
        lastUpdated: new Date().toISOString()
      };

      // Remove any undefined values
      Object.keys(updateData).forEach(key => 
        updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]
      );

      // Update the job document
      const jobRef = doc(db, 'jobs', job.jobID);
      await updateDoc(jobRef, updateData);

      Alert.alert(
        'Success',
        'Service report submitted successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              onComplete?.();
              router.replace(`/job/${job.jobID}?tab=Complete`);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting job details:', error);
      Alert.alert('Error', 'Failed to update job details');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add this style for the signature
  const style = `.m-signature-pad--footer {display: none; margin: 0px;}`;

  // Handle equipment status update
  const handleEquipmentStatus = async (equipment: Equipment, status: string) => {
    const newStatus = equipment.status === status ? 'available' : status;
    const updatedEquipments = equipments.map(eq => 
      eq.serialNo === equipment.serialNo ? { 
        ...eq, 
        status: newStatus,
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: workerId
      } : eq
    );
    setEquipments(updatedEquipments);

    // Update in Firebase
    const jobRef = doc(db, 'jobs', job.jobID);
    await updateDoc(jobRef, { equipments: updatedEquipments });
  };

  // Function to generate unique task ID
  const generateTaskId = () => `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add new task
  const handleAddTask = async () => {
    if (!newTaskName.trim()) {
      Alert.alert('Error', 'Task name is required');
      return;
    }

    const newTask: Task = {
      taskID: generateTaskId(),
      taskName: newTaskName.trim(),
      taskDescription: newTaskDescription.trim(),
      isDone: false,
      isPriority: false,
      completionDate: null
    };

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);

    try {
      if (isOffline) {
        // Store in local queue
        await AsyncStorage.setItem(`tasks_${job.jobID}`, JSON.stringify(updatedTasks));
        await queueAction('ADD_TASK', { jobId: job.jobID, task: newTask });
      } else {
        // Update in Firebase
        const jobRef = doc(db, 'jobs', job.jobID);
        await updateDoc(jobRef, { taskList: updatedTasks });
      }

      setNewTaskName('');
      setNewTaskDescription('');
      setShowAddTask(false);
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Error', 'Failed to add task');
    }
  };

  // Add helper function for queuing actions
  const queueAction = async (type: string, data: any) => {
    const queuedActions = await AsyncStorage.getItem('queuedActions') || '[]';
    const actions = JSON.parse(queuedActions);
    actions.push({
      type,
      data,
      timestamp: Date.now()
    });
    await AsyncStorage.setItem('queuedActions', JSON.stringify(actions));
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedTasks = tasks.filter(task => task.taskID !== taskId);
            setTasks(updatedTasks);

            // Update in Firebase
            try {
              const jobRef = doc(db, 'jobs', job.jobID);
              await updateDoc(jobRef, { taskList: updatedTasks });
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          }
        }
      ]
    );
  };

  // Update handleTakePhoto
  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
        setShowImageModal(true);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Add this function to handle offline image storage
  const handleOfflineImageStorage = async (imageUri: string, description: string) => {
    try {
      const offlineImages = await AsyncStorage.getItem(`offlineImages_${job.jobID}`) || '[]';
      const images = JSON.parse(offlineImages);
      
      images.push({
        uri: imageUri,
        description,
        timestamp: new Date().toISOString(),
        uploadedBy: workerId
      });

      await AsyncStorage.setItem(`offlineImages_${job.jobID}`, JSON.stringify(images));
      
      // Queue the action for later sync
      await queueAction('UPLOAD_IMAGE', {
        jobId: job.jobID,
        imageUri,
        description
      });

      setShowImageModal(false);
      setSelectedImageUri(null);
      setImageDescription('');
      Alert.alert('Success', 'Image saved for upload when online');
    } catch (error) {
      console.error('Error saving offline image:', error);
      Alert.alert('Error', 'Failed to save image offline');
    }
  };

  // Update handleImageUpload to handle offline state
  const handleImageUpload = async () => {
    if (!imageDescription.trim()) {
      Alert.alert('Error', 'Please provide an image description');
      return;
    }

    if (!selectedImageUri) {
      Alert.alert('Error', 'No image selected');
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (isOffline) {
        await handleOfflineImageStorage(selectedImageUri, imageDescription);
      } else {
        // Upload image to storage
        const response = await fetch(selectedImageUri);
        const blob = await response.blob();
        const filename = `jobs/${job.jobID}/images/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        // Create image metadata
        const imageData = {
          url: downloadURL,
          description: imageDescription.trim(),
          timestamp: new Date().toISOString(),
          uploadedBy: workerId
        };

        // Save to Firestore - the onSnapshot listener will handle state update
        const imagesCollection = collection(db, `jobs/${job.jobID}/images`);
        await addDoc(imagesCollection, imageData);
      }

      setShowImageModal(false);
      setSelectedImageUri(null);
      setImageDescription('');
    } catch (error) {
      console.error('Error handling image:', error);
      Alert.alert('Error', 'Failed to handle image');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update the equipment rendering section
  const renderEquipmentItem = (equipment: Equipment) => {
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
            <MaterialCommunityIcons name="air-conditioner" size={20} color="#009DC4" />
            <ThemedText style={styles.equipmentName}>
              {equipment.itemName || 'Customer Equipment'}
            </ThemedText>
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
                <ThemedText style={styles.equipmentValue}>
                  {equipment.modelSeries || 'N/A'}
                </ThemedText>
              </View>
              <View style={styles.equipmentDetail}>
                <ThemedText style={styles.equipmentLabel}>Serial No:</ThemedText>
                <ThemedText style={styles.equipmentValue}>
                  {equipment.serialNo || 'N/A'}
                </ThemedText>
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

  // Add this style configuration
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
  }`;

  // Simplified modal
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
            <ThemedText style={styles.modalTitle}>Technician Signature</ThemedText>
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
              style={[styles.modalButtons, styles.cancelButton]}
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
              style={[styles.modalButtons, styles.saveButton]}
              onPress={() => {
                if (signaturePad) {
                  signaturePad.readSignature();
                }
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
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

  // Update useEffect for images
  useEffect(() => {
    const imagesRef = collection(db, `jobs/${job.jobID}/images`);
    const unsubscribe = onSnapshot(imagesRef, (snapshot) => {
      const imagesList = snapshot.docs.map(doc => {
        const data = doc.data() as ServiceImage;
        return {
          ...data,
          id: doc.id
        };
      });
      
      // Filter out duplicates based on timestamp
      const uniqueImages = imagesList.reduce<ServiceImage[]>((acc, current) => {
        const x = acc.find(item => item.timestamp === current.timestamp);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);

      // Sort by timestamp in descending order (newest first)
      const sortedImages = uniqueImages.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setImages(sortedImages as ServiceImage[]);
    });

    return () => unsubscribe();
  }, [job.jobID]);

  // Add delete image function
  const handleDeleteImage = async (imageId: string) => {
    try {
      await deleteDoc(doc(db, `jobs/${job.jobID}/images/${imageId}`));
      Alert.alert('Success', 'Image deleted successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
      Alert.alert('Error', 'Failed to delete image');
    }
  };

  // Update the task completion handler
  const handleTaskCompletion = async (task: Task) => {
    try {
      const updatedTask = {
        ...task,
        isDone: !task.isDone,
        completionDate: !task.isDone ? new Date().toISOString() : null,
        completedBy: !task.isDone ? workerId : undefined
      };
      
      const updatedTasks = tasks.map(t => 
        t.taskID === task.taskID ? updatedTask : t
      );
      
      // Update local state
      setTasks(updatedTasks);
      
      // Update Firestore immediately
      const jobRef = doc(db, 'jobs', job.jobID);
      await updateDoc(jobRef, { 
        taskList: updatedTasks
      });

    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
      // Revert local state if update fails
      setTasks(tasks);
    }
  };

  const technicianSignatures = query(
    collection(db, `jobs/${job.jobID}/signatures`),
    where('type', '==', 'technician')
  );

  // Add useEffect to fetch existing signature
  useEffect(() => {
    const fetchSignature = async () => {
      const signaturesRef = collection(db, `jobs/${job.jobID}/signatures`);
      const q = query(signaturesRef, where('type', '==', 'technician'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setExistingSignature(snapshot.docs[0].data().signatureURL);
      }
    };
    fetchSignature();
  }, [job.jobID]);

  const handleSaveImageWithDescription = async (description: string) => {
    if (!selectedImageUri || !description.trim()) return;

    try {
      setIsSubmitting(true);
      
      // Upload image to storage
      const response = await fetch(selectedImageUri);
      const blob = await response.blob();
      const filename = `jobs/${job.jobID}/images/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Create image metadata
      const imageData = {
        url: downloadURL,
        description: description.trim(),
        timestamp: new Date().toISOString(),
        uploadedBy: workerId
      };

      // Save to Firestore
      const imagesCollection = collection(db, `jobs/${job.jobID}/images`);
      await addDoc(imagesCollection, imageData);

      // Show success alert
      Alert.alert(
        'Success',
        'Image saved successfully',
        [{ text: 'OK' }]
      );

      // Clear states
      setSelectedImageUri(null);
      setImageDescription('');
      setIsAddingDescription(false);

    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Failed to save image');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelImage = () => {
    if (currentImageIndex !== null) {
      setTempImages(prev => prev.filter((_, index) => index !== currentImageIndex));
    }
    setCurrentImageIndex(null);
    setIsAddingDescription(false);
  };

  // Render images section
  const renderImagesSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="camera" size={20} color="#009DC4" />
        <ThemedText style={styles.sectionTitle}>Images</ThemedText>
        <TouchableOpacity onPress={handleTakePhoto} style={styles.addButton}>
          <MaterialCommunityIcons name="camera-plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.imageGrid}>
        {images.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri: image.url }} style={styles.image} />
            <ThemedText style={styles.imageDescription}>
              {image.description}
            </ThemedText>
            <ThemedText style={styles.imageTimestamp}>
              {new Date(image.timestamp).toLocaleString()}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Description Modal */}
      <Modal
        visible={isAddingDescription}
        transparent
        animationType="slide"
        onRequestClose={handleCancelImage}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Add Image Description</ThemedText>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Enter description"
              multiline
              value={imageDescription}
              onChangeText={setImageDescription}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={handleCancelImage} style={styles.cancelButton}>
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleSaveImageWithDescription(imageDescription)}
                style={styles.saveButton}
                disabled={!imageDescription.trim()}
              >
                <ThemedText style={styles.buttonText}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  return (
    <ScrollView style={styles.screenContainer}>
      {/* Tasks Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="clipboard-list" size={24} color="#009DC4" />
          <ThemedText style={styles.sectionTitle}>Tasks</ThemedText>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddTask(true)}
          >
            <MaterialCommunityIcons name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Add Task Form */}
        {showAddTask && (
          <View style={styles.addTaskForm}>
            <TextInput
              style={styles.input}
              placeholder="Task Name"
              value={newTaskName}
              onChangeText={setNewTaskName}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Task Description"
              value={newTaskDescription}
              onChangeText={setNewTaskDescription}
              multiline
              numberOfLines={3}
            />
            <View style={styles.formButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowAddTask(false);
                  setNewTaskName('');
                  setNewTaskDescription('');
                }}
              >
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.addButton]}
                onPress={handleAddTask}
              >
                <ThemedText style={styles.buttonText}>Add Task</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tasks List */}
        {tasks.map((task, index) => (
          <Swipeable
            key={task.taskID || `task-${index}`}
            renderRightActions={() => (
              <TouchableOpacity 
                style={styles.deleteAction}
                onPress={() => handleDeleteTask(task.taskID)}
              >
                <MaterialCommunityIcons name="delete" size={24} color="white" />
              </TouchableOpacity>
            )}
          >
            <View style={styles.taskItem}>
              <TouchableOpacity 
                onPress={() => {
                  handleTaskCompletion(task);
                }}
              >
                <MaterialCommunityIcons 
                  name={task.isDone ? "checkbox-marked" : "checkbox-blank-outline"} 
                  size={24} 
                  color="#666" 
                />
              </TouchableOpacity>
              <View style={styles.taskDetails}>
                <ThemedText style={[
                  styles.taskName,
                  task.isDone && styles.taskCompleted
                ]}>
                  {task.taskName}
                </ThemedText>
                <ThemedText style={styles.taskDescription}>
                  {task.taskDescription}
                </ThemedText>
                {task.isDone && task.completionDate && (
                  <ThemedText style={styles.taskMeta}>
                    Completed by {task.completedBy} on{' '}
                    {new Date(task.completionDate).toLocaleString()}
                  </ThemedText>
                )}
              </View>
            </View>
          </Swipeable>
        ))}
      </View>

      {/* Equipment Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="air-conditioner" size={24} color="#009DC4" />
          <ThemedText style={styles.sectionTitle}>Equipment</ThemedText>
        </View>
        {equipments.map((equipment, index) => (
          <Swipeable
            key={equipment.serialNo || `equipment-${index}`}
            renderRightActions={() => (
              <View style={styles.swipeActions}>
                <TouchableOpacity 
                  style={[styles.swipeAction, styles.usedAction]}
                  onPress={() => handleEquipmentStatus(equipment, 'used')}
                >
                  <ThemedText style={styles.actionText}>Mark Used</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.swipeAction, styles.defectiveAction]}
                  onPress={() => handleEquipmentStatus(equipment, 'defective')}
                >
                  <ThemedText style={styles.actionText}>Mark Defective</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          >
            {renderEquipmentItem(equipment)}
          </Swipeable>
        ))}
      </View>

      {/* Images Section */}
      {renderImagesSection()}

      {/* Signature Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="pen" size={24} color="#009DC4" />
          <ThemedText style={styles.sectionTitle}>Technician Signature</ThemedText>
        </View>
        
        {signature ? (
          <View style={styles.signaturePreview}>
            <Image source={{ uri: signature }} style={styles.signatureImage} />
            <TouchableOpacity 
              style={styles.retakeButton}
              onPress={() => setShowSignatureModal(true)}
            >
              <ThemedText style={styles.retakeButtonText}>Retake Signature</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.addSignatureButton}
            onPress={() => setShowSignatureModal(true)}
          >
            <MaterialCommunityIcons name="pen" size={24} color="#009DC4" />
            <ThemedText style={styles.addSignatureText}>Add Signature</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {renderSignatureModal()}

      {/* Submit Button */}
      <TouchableOpacity 
        style={[
          styles.submitButton,
          isSubmitting && styles.submitButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <MaterialCommunityIcons name="check-circle" size={24} color="white" />
            <ThemedText style={styles.submitButtonText}>Submit Service Report</ThemedText>
          </>
        )}
      </TouchableOpacity>

      {/* Image Upload Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowImageModal(false);
          setSelectedImageUri(null);
          setImageDescription('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Add Image Description</ThemedText>
            
            {selectedImageUri && (
              <Image 
                source={{ uri: selectedImageUri }} 
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}

            <TextInput
              style={styles.descriptionInput}
              placeholder="Enter image description"
              value={imageDescription}
              onChangeText={setImageDescription}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowImageModal(false);
                  setSelectedImageUri(null);
                  setImageDescription('');
                }}
              >
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, !imageDescription.trim() && styles.buttonDisabled]}
                onPress={() => handleImageUpload()}
                disabled={!imageDescription.trim()}
              >
                <ThemedText style={styles.buttonText}>Upload</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  addButton: {
    backgroundColor: '#009DC4',
    marginLeft: 'auto',
    padding: 8,
    borderRadius: 4,
  },
  taskItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  taskDetails: {
    marginLeft: 12,
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '500',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  taskMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  equipmentItem: {
    backgroundColor: '#fff',
    marginVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  equipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
  },
  equipmentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  equipmentContent: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  equipmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  equipmentLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
    fontWeight: '500',
  },
  equipmentValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  equipmentNotes: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  notesLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  notes: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  imageMeta: {
    fontSize: 12,
    color: '#666',
  },
  addImageButton: {
    width: '48%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },

  modalContent: {
    backgroundColor: 'white',
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    padding: 20,
  },
  

  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  signaturePadContainer: {
    height: 300,
    backgroundColor: '#fff',
  },

  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: '#009DC4',
  },

  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },

  deleteAction: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  signatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#009DC4',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  signatureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addTaskForm: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 16,
  },

  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  signaturePreview: {
    padding: 16,
    alignItems: 'center',
  },
  signatureImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  retakeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  retakeButtonText: {
    color: '#666',
  },
  addSignatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#009DC4',
    borderStyle: 'dashed',
    borderRadius: 8,
    margin: 16,
    gap: 8,
  },
  addSignatureText: {
    color: '#009DC4',
    fontSize: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#009DC4',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },


  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },

  saveText: {
    color: 'white',
  },
  deleteImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    borderRadius: 20,
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },

  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#666',
  },
  saveButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#009DC4',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  imageContainer: {
    width: '48%',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  imageDescription: {
    fontSize: 12,
    marginTop: 4,
    color: '#666',
  },
  imageTimestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  swipeActions: {
    flexDirection: 'row',
  },
  swipeAction: {
    justifyContent: 'center',
    padding: 20,
    width: 100,
  },
  usedAction: {
    backgroundColor: '#4CAF50',
  },
  defectiveAction: {
    backgroundColor: '#F44336',
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
    backgroundColor: '#ccc',
  },

}); 
