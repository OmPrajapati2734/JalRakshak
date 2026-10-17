import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase.js';

export const authService = {
  isConfigured() {
    return isFirebaseConfigured && Boolean(auth);
  },

  getCurrentUser() {
    return auth?.currentUser || null;
  },

  onAuthChange(callback) {
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  },

  async signUp(email, password) {
    if (!auth) {
      throw new Error('Firebase Authentication is not configured. Please supply Firebase credentials.');
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      return cred.user;
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      if (err.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters.');
      }
      if (err.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      throw new Error(err.message || 'Failed to create account.');
    }
  },

  async signIn(email, password) {
    if (!auth) {
      throw new Error('Firebase Authentication is not configured. Please supply Firebase credentials.');
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      return cred.user;
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password.');
      }
      if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please wait a moment before trying again.');
      }
      throw new Error(err.message || 'Failed to sign in.');
    }
  },

  async signOut() {
    if (!auth) return;
    await signOut(auth);
  }
};
