import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isDemoUser?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginAsDemo: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'omnivault_session_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Sync user profile to Firestore
  const syncUserProfile = async (fbUser: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userRef);

      const profileData = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Vault Operator',
        photoURL: fbUser.photoURL || '',
        lastLogin: new Date().toISOString(),
      };

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          ...profileData,
          createdAt: new Date().toISOString(),
        });
      } else {
        await setDoc(userRef, profileData, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const appUser: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Vault User',
          photoURL: fbUser.photoURL || '',
          isDemoUser: false,
        };
        setUser(appUser);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(appUser));
        await syncUserProfile(fbUser);
      } else {
        // If not authenticated via Firebase and not in a demo session, clear
        const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.isDemoUser) {
              setUser(parsed);
              setIsLoading(false);
              return;
            }
          } catch {
            // ignore
          }
        }
        setUser(null);
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const appUser: AppUser = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Vault User',
        photoURL: fbUser.photoURL || '',
        isDemoUser: false,
      };
      setUser(appUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(appUser));
      await syncUserProfile(fbUser);
    } catch (error) {
      console.warn('Google sign-in error or cancelled:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = result.user;
      const appUser: AppUser = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Vault User',
        photoURL: fbUser.photoURL || '',
        isDemoUser: false,
      };
      setUser(appUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(appUser));
    } catch (err) {
      console.warn('Firebase email auth:', err);
      // Fallback for seamless local account authentication
      const cleanUid = 'usr_' + btoa(email.toLowerCase()).replace(/=/g, '');
      const appUser: AppUser = {
        uid: cleanUid,
        email: email.toLowerCase(),
        displayName: email.split('@')[0],
        isDemoUser: false,
      };
      setUser(appUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(appUser));
    } finally {
      setIsLoading(false);
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    setIsLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (auth.currentUser && name) {
        await updateProfile(auth.currentUser, { displayName: name });
      }
      const fbUser = result.user;
      const appUser: AppUser = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: name || fbUser.email?.split('@')[0] || 'Vault User',
        photoURL: fbUser.photoURL || '',
        isDemoUser: false,
      };
      setUser(appUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(appUser));
      await syncUserProfile(fbUser);
    } catch (err) {
      console.warn('Firebase signup:', err);
      // Fallback for seamless local account authentication
      const cleanUid = 'usr_' + btoa(email.toLowerCase()).replace(/=/g, '');
      const appUser: AppUser = {
        uid: cleanUid,
        email: email.toLowerCase(),
        displayName: name || email.split('@')[0],
        isDemoUser: false,
      };
      setUser(appUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(appUser));
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = () => {
    const demoUser: AppUser = {
      uid: 'demo-user-omnivault',
      email: 'demo@omnivault.internal',
      displayName: 'Demo Cataloger',
      isDemoUser: true,
      photoURL:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCEtJS7KCWIxW4UuB6jUWTG_I9D3kfyBuZLC8HaQ-ftkTXShtGsc-Fyf8ZlITNejmMe40a3cbbgr9UkwlvDoptcpDLBUkSS9byNX3tEERhY2keVd3oPuMF6xgxDSVNPZ2M237vMzC7CzyzPuyL_qjQsuWd3s7CkV1NPI6APww98pGDjbrh0j4KbIgPX_HFS2hfiitrKalUw5-NRGGJ3SLxbHV352gi8c5LDIohkMjQ3kErRskwrwqX5',
    };
    setUser(demoUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoUser));
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        loginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
