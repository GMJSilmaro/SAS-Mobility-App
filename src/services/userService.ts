import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from '../types/user';

export const getUserData = async (userId: string): Promise<User | null> => {
  try {
    // Query workers collection using userId (auth uid)
    const workersRef = collection(db, 'users');
    const q = query(workersRef, where('uid', '==', userId));
    const workerSnapshot = await getDocs(q);

    if (!workerSnapshot.empty) {
      const workerDoc = workerSnapshot.docs[0];
      const workerData = workerDoc.data();
      return {
        ...workerData,
        workerId: workerDoc.id, // This is the document ID from workers collection
        uid: userId // This is the Firebase Auth UID
      } as User;
    }

    console.log('No worker found for auth ID:', userId);
    return null;
  } catch (error) {
    console.error('Error fetching worker data:', error);
    throw error;
  }
};

// Add this new function to get worker by workerId directly
export const getWorkerById = async (workerId: string): Promise<User | null> => {
  try {
    const workerRef = doc(db, 'workers', workerId);
    const workerDoc = await getDoc(workerRef);

    if (workerDoc.exists()) {
      const workerData = workerDoc.data();
      return {
        ...workerData,
        workerId: workerDoc.id,
        uid: workerData.uid
      } as User;
    }

    console.log('No worker found with workerId:', workerId);
    return null;
  } catch (error) {
    console.error('Error fetching worker by ID:', error);
    throw error;
  }
}; 