// services/userService.ts

import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import app  from '../../firebase/config';

const db = getFirestore(app);

export const addEmergencyContact = async (number: string) => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  await addDoc(collection(db, 'contacts'), {
    uid: user.uid,
    number
  });
};

export const getEmergencyContacts = async (): Promise<string[]> => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const q = query(collection(db, 'contacts'), where('uid', '==', user.uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data().number);
};

export const getDefaultContact = async (): Promise<string> => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const q = query(collection(db, 'contacts'), where('uid', '==', user.uid), where('defaultContact', '!=', null));

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error("No default contact found");
  }

  return snapshot.docs[0].data().number;
};

export const deleteEmergencyContact = async (contact: string) => {
  const user = getAuth().currentUser;
  if (!user) throw new Error("User not authenticated");

  const q = query(
    collection(db, 'contacts'),
    where('uid', '==', user.uid),
    where('number', '==', contact)
  );

  const snapshot = await getDocs(q);

  const deletePromises = snapshot.docs.map(docSnap =>
    deleteDoc(docSnap.ref) 
  );

  await Promise.all(deletePromises);
};