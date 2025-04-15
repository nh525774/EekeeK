// src/api/auth.js
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification
  } from "firebase/auth";
  import { auth } from "./firebase";
  
  export const registerWithEmail = async (email, password) => {
    
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await sendEmailVerification(userCredential.user);

      return { user: userCredential.user};
  };

  export const loginWithEmail = async (email, password) => {
  
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      return { user: userCredential.user, token };
    
  };
  