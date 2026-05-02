import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseApp = initializeApp({
  apiKey: 'AIzaSyAMKyd-XKoWLH7y7S9cSQvJI_fVxhmIjzQ',
  authDomain: 'nyc.devrelcon.dev',
  databaseURL: 'https://devrelcon-ny-2024-default-rtdb.firebaseio.com',
  projectId: 'devrelcon-ny-2024',
  storageBucket: 'devrelcon-ny-2024.appspot.com',
  messagingSenderId: '1041548912043',
  appId: '1:1041548912043:web:665ec6564e0cc115cadeee',
  measurementId: 'G-2Y6HFTHD8M',
});
export const db = getFirestore(firebaseApp);
