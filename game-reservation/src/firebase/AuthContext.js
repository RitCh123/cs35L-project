import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from './config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Helper function to check if email is from UCLA
function isUCLAEmail(email) {
  return email.endsWith('@ucla.edu') || email.endsWith('@g.ucla.edu');
}

// Helper function to check if user is admin
function isAdmin(email) {
  const adminEmails = [
    'rchavali@g.ucla.edu'
    // 'nks676@g.ucla.edu'
  ];
  return adminEmails.includes(email);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  async function googleSignIn() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;
      
      // Check if the email is from UCLA
      if (!isUCLAEmail(email)) {
        // If not a UCLA email, sign them out
        await logout();
        throw new Error('Only UCLA email addresses (@ucla.edu or @g.ucla.edu) are allowed to sign in.');
      }

      // Set user role based on email
      const role = isAdmin(email) ? 'ADMIN' : 'USER';
      setUserRole(role);
      
      return result;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !isUCLAEmail(user.email)) {
        // If somehow a non-UCLA user is authenticated, sign them out
        logout();
        setCurrentUser(null);
        setUserRole(null);
      } else {
        setCurrentUser(user);
        if (user) {
          setUserRole(isAdmin(user.email) ? 'ADMIN' : 'USER');
        } else {
          setUserRole(null);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    signup,
    login,
    logout,
    googleSignIn
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 