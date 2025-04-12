import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  addEmergencyContact,
  deleteEmergencyContact,
  getEmergencyContacts,
} from "../../services/userService";
import { useTranslation } from "../../context/TranslationContext";
import { doc, getFirestore, updateDoc, collection, where, getDocs, query } from 'firebase/firestore';

export default function Profile() {
  const auth = getAuth();
  const { targetLanguage, translateText } = useTranslation();

  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [input, setInput] = useState("");
  const [contacts, setContacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  // Strings to be translated
  const uiStrings = {
    loginRegister: "Login or Register",
    email: "Email",
    password: "Password",
    login: "Login",
    register: "Register",
    welcome: "Welcome",
    yourContacts: "Your Emergency Contacts",
    noContacts: "No contacts found.",
    addContact: "Add Contact",
    cancel: "Cancel",
    logout: "Logout",
    addNumber: "Add new number",
    deleteConfirmation: "Are you sure you want to delete",
    deleteContact: "Delete Contact",
    loggedOut: "Logged out",
    error: "Error", 
    loggedIn: "Logged in",
    loginInError: "Login Error",
    rgSuccess: "Registered successfully",
    rgError: "Registration Error",
  };

  // Translate UI on language change
  useEffect(() => {
    const translateUI = async () => {
      if (targetLanguage === "en") {
        setTranslations(uiStrings);
        return;
      }

      setIsTranslating(true);
      try {
        const translated: Record<string, string> = {};
        for (const key in uiStrings) {
          translated[key] = await translateText(uiStrings[key]);
        }
        setTranslations(translated);
      } catch (error) {
        console.error("Translation error:", error);
      } finally {
        setIsTranslating(false);
      }
    };

    translateUI();
  }, [targetLanguage]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) loadContacts();
    });
    return unsubscribe;
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await getEmergencyContacts();
      setContacts(data);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    const auth = getAuth();
    const contactId = auth.currentUser?.uid; // Safely get user ID
    if (!input.trim()) return;
  
    try {
      await addEmergencyContact(input.trim());
      setInput("");
  
      Alert.alert("Do you want it to be a default number?", "", [
        {
          text: "Yes",
          onPress: async () => {
            try {
              const db = getFirestore();
              const auth = getAuth();
              const currentUser = auth.currentUser;
          
              if (!currentUser) throw new Error("User not authenticated");
          
              // 🔍 Find the contact doc with this number and current user
              const q = query(
                collection(db, "contacts"),
                where("uid", "==", currentUser.uid),
                where("number", "==", input.trim())
              );
          
              const snapshot = await getDocs(q);
          
              if (!snapshot.empty) {
                const contactDoc = snapshot.docs[0];
                // ✅ Add the 'defaultContact' field to this doc
                await updateDoc(doc(db, "contacts", contactDoc.id), {
                  defaultContact: input.trim(),
                });
          
                console.log("Default contact field added to contact!");
              } else {
                console.warn("No contact found to mark as default.");
              }
            } catch (error) {
              console.error("Error saving default contact: ", error);
            }
          }
          
        },
        { text: "No" },
      ]);
  
      loadContacts();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleDeleteContact = (contact: string) => {
    Alert.alert(
      translations.deleteContact || "Delete Contact",
      `${translations.deleteConfirmation || "Are you sure you want to delete"} ${contact}?`,
      [
        { text: translations.cancel || "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEmergencyContact(contact);
              loadContacts();
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert(translations.loggedOut || "Logged out");
    } catch (error: any) {
      Alert.alert(translations.error || "Error", error.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert(translations.loggedIn || "Logged in");
    } catch (error: any) {
      Alert.alert(translations.loggedInError || "Login Error", error.message);
    }
  };

  const handleRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert(translations.rgSuccess ||"Registered successfully");
    } catch (error: any) {
      Alert.alert(translations.rgError || "Registration Error", error.message);
    }
  };

  if (loading || isTranslating) {
    return (
      <ActivityIndicator size="large" color="#000" style={styles.loader} />
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{translations.loginRegister}</Text>

        <TextInput
          placeholder={translations.email}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          placeholder={translations.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <Button title={translations.login} onPress={handleLogin} />
        <View style={{ marginVertical: 10 }} />
        <Button title={translations.register} onPress={handleRegister} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>
        {translations.welcome},{" "}
        {user.email.split("@")[0].charAt(0).toUpperCase() +
          user.email.split("@")[0].slice(1)}
        !
      </Text>
      <Text style={styles.title}>{translations.yourContacts}</Text>

      {contacts.length === 0 ? (
        <Text style={styles.fallback}>{translations.noContacts}</Text>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleDeleteContact(item)}>
              <Text style={styles.contactItem}>{item}</Text>
            </TouchableOpacity>
          )}
          style={styles.list}
        />
      )}

      {isAdding ? (
        <>
          <TextInput
            placeholder={translations.addNumber}
            value={input}
            onChangeText={setInput}
            keyboardType="numeric"
            style={styles.input}
          />
          <Button title={translations.addContact} onPress={handleAddContact} />
          <View style={{ marginVertical: 5 }} />
          <Button
            title={translations.cancel}
            onPress={() => {
              setIsAdding(false);
              setInput("");
            }}
            color="gray"
          />
        </>
      ) : (
        <Button title={translations.addContact} onPress={() => setIsAdding(true)} />
      )}

      <View style={styles.logoutContainer}>
        <Button title={translations.logout} onPress={handleLogout} color="crimson" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 30, flex: 1 },
  welcome: { fontSize: 25, marginBottom: 20 },
  title: { fontSize: 22, marginBottom: 15, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  list: { marginBottom: 20 },
  contactItem: {
    fontSize: 18,
    padding: 8,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  logoutContainer: { marginTop: 20 },
  fallback: { fontSize: 18, color: "gray", marginVertical: 10 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
});
