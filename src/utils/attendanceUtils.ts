import { db } from '@/src/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const checkUserClockInStatus = async (workerId: string): Promise<boolean> => {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Reference to the attendance document
    const attendanceRef = doc(db, 'users', workerId, 'attendanceLogs', today);
    const attendanceDoc = await getDoc(attendanceRef);

    if (!attendanceDoc.exists()) {
      return false;
    }

    const data = attendanceDoc.data();
    return data?.isClockIn === true;

  } catch (error) {
    console.error('Error checking clock-in status:', error);
    return false;
  }
}; 