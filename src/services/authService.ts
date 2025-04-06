// src/services/authService.ts
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase/config";

export const signUp = async (email: string, pin: string) => {
  return await createUserWithEmailAndPassword(auth, email, pin);
};

export const login = async (email: string, pin: string) => {
  return await signInWithEmailAndPassword(auth, email, pin);
};
