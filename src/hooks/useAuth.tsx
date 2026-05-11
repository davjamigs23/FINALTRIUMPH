import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';                
import { auth, db } from '../firebase';
import { AppUser, UserRole } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (isRegistration?: boolean, role?: UserRole, displayName?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string, role?: UserRole) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
        }
        
        if (firebaseUser) {
            // Quota Fallback Check
            const previewAccounts: Record<string, UserRole> = {
              'djignaci1@gmail.com': 'STUDENT',
              'djignacio@gbox.adnu.edu.ph': 'ADMIN',
              'djignaci2@gmail.com': 'FINANCE'
            };

            const userDocRef = doc(db, 'users', firebaseUser.uid);
            
            const timeoutId = setTimeout(() => {
              if (previewAccounts[firebaseUser.email || '']) {
                setUser({
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  displayName: firebaseUser.displayName || 'Test User',
                  photoURL: firebaseUser.photoURL || '',
                  role: previewAccounts[firebaseUser.email || ''],
                  createdAt: new Date().toISOString() as any
                });
                setLoading(false);
              } else {
                console.warn("Firestore connection took too long. Check if Firestore is enabled in your Firebase Console.");
                setUser(null);
                setLoading(false);
              }
            }, 6000);

            unsubscribeSnapshot = onSnapshot(userDocRef, 
              async (userDoc) => {
                clearTimeout(timeoutId);
                if (userDoc.exists()) {
                  const data = userDoc.data() as AppUser;
                  
                  // Proactive role update for requested administrative accounts
                  let targetRole: UserRole | null = null;
                  if (data.email === 'djignacio@gbox.adnu.edu.ph') {
                    if (data.role !== 'ADMIN') targetRole = 'ADMIN';
                  } else if (data.email === 'djignaci2@gmail.com') {
                    if (data.role !== 'FINANCE') targetRole = 'FINANCE';
                  } else if (data.email === 'djignaci1@gmail.com') {
                    if (data.role !== 'STUDENT') targetRole = 'STUDENT';
                  }

                  if (targetRole) {
                    try {
                      await updateDoc(userDocRef, { role: targetRole });
                      // The next snapshot will have the updated role
                      return;
                    } catch (e) {
                      console.error("Failed to auto-update admin role:", e);
                    }
                  }

                  setUser(data);
                } else {
                  // If doc doesn't exist but it's a preview account, allow them in
                  if (previewAccounts[firebaseUser.email || '']) {
                    setUser({
                      uid: firebaseUser.uid,
                      email: firebaseUser.email || '',
                      displayName: firebaseUser.displayName || 'Test User',
                      photoURL: firebaseUser.photoURL || '',
                      role: previewAccounts[firebaseUser.email || ''],
                      createdAt: new Date().toISOString() as any
                    });
                  } else {
                    setUser(null);
                  }
                }
                setLoading(false);
              },
              (error) => {
                clearTimeout(timeoutId);
                // Quota Fallback for specific accounts on error
                if (previewAccounts[firebaseUser.email || ''] && (error.message.includes('Quota limit exceeded') || error.message.includes('quota'))) {
                  setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    displayName: firebaseUser.displayName || 'Test User (Quota Mode)',
                    photoURL: firebaseUser.photoURL || '',
                    role: previewAccounts[firebaseUser.email || ''],
                    createdAt: new Date().toISOString() as any
                  });
                  setLoading(false);
                } else {
                  setLoading(false);
                  handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
                }
              }
            );
        } else {
          setUser(null);
          setLoading(false);
        }
    });
    
    return () => {
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        unsubscribeAuth();
    }
  }, []);

  const signIn = async (isRegistration: boolean = false, role: UserRole = 'STUDENT', displayName?: string) => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const userDocRef = doc(db, 'users', result.user.uid);
      
      let userDoc;
      try {
        userDoc = await getDoc(userDocRef);
      } catch (e: any) {
        const previewEmails = ['djignaci1@gmail.com', 'djignacio@gbox.adnu.edu.ph', 'djignaci2@gmail.com'];
        if (previewEmails.includes(result.user.email || '') && (e.message.includes('Quota limit exceeded') || e.message.includes('quota'))) {
          return;
        }
        throw e;
      }
      
      if (!userDoc.exists()) {
        if (!isRegistration) {
          // It's a login attempt but account doesn't exist
          await signOut(auth);
          throw new Error('No account found for this Google email. Please create an account first.');
        }

        const email = result.user.email || '';
        
        let finalRole: UserRole = isRegistration ? role : 'STUDENT';
        
        // Overwrite role for specific administrative accounts
        if (email === 'djignacio@gbox.adnu.edu.ph') {
          finalRole = 'ADMIN';
        } else if (email === 'djignaci2@gmail.com') {
          finalRole = 'FINANCE';
        } else if (email === 'djignaci1@gmail.com') {
          finalRole = 'STUDENT';
        }
        
        const newUser = {
          uid: result.user.uid,
          email: email,
          displayName: displayName || result.user.displayName || 'Student',
          photoURL: result.user.photoURL || '',
          role: finalRole,
          createdAt: serverTimestamp(),
        };
        
        try {
          await setDoc(userDocRef, newUser);
        } catch (firestoreErr: any) {
          console.error("Failed to create Firestore profile during Google Sign-In:", firestoreErr);
          if (auth.currentUser) {
            try {
              await auth.currentUser.delete();
            } catch (deleteErr) {
              console.error("Failed to clean up Auth user:", deleteErr);
            }
          }
          throw firestoreErr;
        }
      } else {
        // Doc exists
        if (isRegistration) {
          // It's a registration attempt but account already exists
          throw new Error('This account already exists. Please sign in instead.');
        }
      }
      // If doc exists, internal state user will be set by the onSnapshot listener in useEffect
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('User closed the sign-in popup.');
        return;
      }
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, 'users', result.user.uid);
      
      let userDoc;
      try {
        userDoc = await getDoc(userDocRef);
      } catch (e: any) {
        const previewEmails = ['djignaci1@gmail.com', 'djignacio@gbox.adnu.edu.ph', 'djignaci2@gmail.com'];
        if (previewEmails.includes(email) && (e.message.includes('Quota limit exceeded') || e.message.includes('quota'))) {
          return;
        }
        throw e;
      }
      
      if (!userDoc.exists()) {
        // If Auth succeeds but Firestore doc is missing, they haven't "registered" their role
        await signOut(auth);
        throw new Error('This account was partially created but no profile exists. Please go to the Register tab and create your account there.');
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        throw new Error('Incorrect email or password. If you originally signed up with Google, please use the "Continue with Google" button.');
      }
      if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later or reset your password.');
      }
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string, role: UserRole = 'STUDENT') => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);                
      
      let finalRole = role;
      
      // Explicitly set roles for sensitive accounts regardless of requested role
      if (email === 'djignacio@gbox.adnu.edu.ph') {
        finalRole = 'ADMIN';
      } else if (email === 'djignaci2@gmail.com') {
        finalRole = 'FINANCE';
      } else if (email === 'djignaci1@gmail.com') {
        finalRole = 'STUDENT';
      }

      // Create Firestore document immediately
      const userDocRef = doc(db, 'users', result.user.uid);
      const newUser = {
        uid: result.user.uid,
        email: email,
        displayName: displayName,
        photoURL: '',
        role: finalRole,
        createdAt: serverTimestamp(),
      };
      
      try {
        await setDoc(userDocRef, newUser);
      } catch (firestoreErr: any) {
        console.error("Failed to create Firestore profile during registration:", firestoreErr);
        if (auth.currentUser) {
          try {
            await auth.currentUser.delete();
          } catch (deleteErr) {
            console.error("Failed to clean up Auth user:", deleteErr);
          }
        }
        throw firestoreErr;
      }

      // Update Firebase Auth profile
      try {
        const { updateProfile } = await import('firebase/auth');
        await updateProfile(result.user, { displayName });
      } catch (authErr: any) {
        console.error("Failed to update Auth profile displayName:", authErr);
      }
    } catch (err: any) {
      console.error("Sign up error code:", err.code);
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. If you signed in with Google previously, please use "Continue with Google" to log in.');
      }
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: false
    };
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithEmail, signUpWithEmail, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
