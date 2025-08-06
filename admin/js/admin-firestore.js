/**
 * Reusable Module for Firestore Admin Operations
 */
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

let db;

export function initializeDb(app) {
    db = getFirestore(app);
}

// Fetch all documents from a collection, ordered by creation date
export async function fetchDocs(collectionName) {
    if (!db) throw new Error("Database not initialized. Call initializeDb first.");
    const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const docs = [];
    querySnapshot.forEach(doc => {
        docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
}

// Fetch a single document by its ID
export async function getDocById(collectionName, docId) {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        throw new Error("No such document!");
    }
}

// Add a new document to a collection
export async function addDocument(collectionName, data) {
    if (!db) throw new Error("Database not initialized.");
    return await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp()
    });
}

// Update an existing document
export async function updateDocument(collectionName, docId, data) {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, collectionName, docId);
    return await updateDoc(docRef, data);
}

// Delete a document by its ID
export async function deleteDocument(collectionName, docId) {
    if (!db) throw new Error("Database not initialized.");
    await deleteDoc(doc(db, collectionName, docId));
}

// Helper to convert a file to a Base64 string for Firestore storage
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}