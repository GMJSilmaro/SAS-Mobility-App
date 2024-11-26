import { collection, query, getDocs, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { Job } from '../../src/types/job';

export const getJobs = async (currentWorkerId: string | string[]): Promise<Job[]> => {
  try {
    console.log('Fetching all jobs');
    const jobsRef = collection(db, 'jobs');
    
    const q = query(jobsRef, orderBy('startDate', 'desc'));
    const querySnapshot = await getDocs(q);
    
    console.log('Number of jobs found:', querySnapshot.size);
    
    const jobs = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        jobID: doc.id,
      } as Job;
    });
    
    return jobs;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }
};

export const getJob = async (jobId: string): Promise<Job | null> => {
  try {
    const jobRef = doc(db, 'jobs', jobId);
    const jobDoc = await getDoc(jobRef);
    
    if (jobDoc.exists()) {
      return {
        ...jobDoc.data(),
        jobID: jobDoc.id,
      } as Job;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching job:', error);
    return null;
  }
};

export const updateJobStatus = async (jobId: string, status: string) => {
  try {
    const jobRef = doc(db, 'jobs', jobId);
    
    await updateDoc(jobRef, {
      jobStatus: status,
      lastUpdated: new Date(),
    });

    return true;
  } catch (error) {
    console.error('Error updating job status:', error);
    throw new Error('Failed to update job status');
  }
}; 