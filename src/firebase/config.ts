
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyAs-placeholder",
  authDomain: "valutabot-placeholder.firebaseapp.com",
  projectId: "valutabot-placeholder",
  storageBucket: "valutabot-placeholder.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000000000"
};

export function getFirebaseConfig() {
  return firebaseConfig;
}

export function initializeFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return initializeApp(firebaseConfig);
}
