import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface OfflineAction {
  type: string;
  data: any;
  timestamp: number;
}

export const OfflineSync = {
  async queueAction(action: OfflineAction) {
    try {
      const queue = await this.getQueue();
      queue.push(action);
      await AsyncStorage.setItem('offlineQueue', JSON.stringify(queue));
    } catch (error) {
      console.error('Error queuing offline action:', error);
    }
  },

  async getQueue(): Promise<OfflineAction[]> {
    try {
      const queue = await AsyncStorage.getItem('offlineQueue');
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  },

  async syncQueue() {
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) return;

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) return;

      // Process each queued action
      for (const action of queue) {
        // Implement your sync logic here based on action type
        switch (action.type) {
          case 'UPDATE_JOB_STATUS':
            // Sync job status updates
            break;
          case 'SUBMIT_FORM':
            // Sync form submissions
            break;
          // Add other cases as needed
        }
      }

      // Clear the queue after successful sync
      await AsyncStorage.setItem('offlineQueue', JSON.stringify([]));
    } catch (error) {
      console.error('Error syncing offline queue:', error);
    }
  }
}; 