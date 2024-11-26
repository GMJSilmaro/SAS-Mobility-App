import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const getAttendanceLogs = async (workerId: string, date: string) => {
  try {
    const userAttendanceRef = doc(
      collection(doc(collection(db, 'users'), workerId), 'attendanceLogs'),
      date
    );
    const snapshot = await getDoc(userAttendanceRef);

    return snapshot.exists() ? snapshot.data()?.logs || [] : [];
  } catch (error) {
    console.error('Error fetching attendance logs:', error);
    return [];
  }
}; 