import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase.js';

export interface DocWithId {
  id: string;
  [key: string]: unknown;
}

/** Fetch all documents in a collection, ordered by a field. */
export const fetchCollection = async (
  path: string,
  orderField = 'order',
): Promise<DocWithId[]> => {
  const q = query(collection(db, path), orderBy(orderField));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
};

/** Subscribe to a collection in real-time. Returns unsubscribe function. */
export const subscribeCollection = (
  path: string,
  orderField: string,
  callback: (docs: DocWithId[]) => void,
): Unsubscribe => {
  const q = query(collection(db, path), orderBy(orderField));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
  });
};

/** Fetch a single document by path and ID. */
export const fetchDocument = async (
  path: string,
  id: string,
): Promise<DocWithId | null> => {
  const snapshot = await getDoc(doc(db, path, id));
  if (!snapshot.exists()) return null;
  return { ...snapshot.data(), id: snapshot.id };
};

/** Create or update a document. If id is provided, uses setDoc. */
export const saveDocument = async (
  path: string,
  id: string,
  data: Record<string, unknown>,
): Promise<void> => {
  const { id: _id, ...writeData } = data;
  await setDoc(doc(db, path, id), writeData);
};

/** Delete a document. */
export const removeDocument = async (
  path: string,
  id: string,
): Promise<void> => {
  await deleteDoc(doc(db, path, id));
};

/** Fetch subcollection documents. */
export const fetchSubcollection = async (
  parentPath: string,
  parentId: string,
  subcollection: string,
  orderField = 'order',
): Promise<DocWithId[]> => {
  const q = query(
    collection(db, parentPath, parentId, subcollection),
    orderBy(orderField),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
};

/** Save a subcollection document. */
export const saveSubcollectionDoc = async (
  parentPath: string,
  parentId: string,
  subcollection: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<void> => {
  const { id: _id, ...writeData } = data;
  await setDoc(doc(db, parentPath, parentId, subcollection, docId), writeData);
};

/** Delete a subcollection document. */
export const removeSubcollectionDoc = async (
  parentPath: string,
  parentId: string,
  subcollection: string,
  docId: string,
): Promise<void> => {
  await deleteDoc(doc(db, parentPath, parentId, subcollection, docId));
};

/** Generate a new document ID (zero-padded, next available). */
export const nextPaddedId = (existingIds: string[], padLength = 3): string => {
  const maxNum = existingIds.reduce((max, id) => {
    const num = parseInt(id, 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, -1);
  return String(maxNum + 1).padStart(padLength, '0');
};
