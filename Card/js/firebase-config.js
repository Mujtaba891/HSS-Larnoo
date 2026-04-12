// =====================================================
// firebase-config.js
// Firebase initialization & shared application state
// =====================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore, collection, onSnapshot, doc, deleteDoc, updateDoc,
    query, orderBy, addDoc, runTransaction, serverTimestamp, where, getDocs, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDgibN6D0v5LYueImGQw1oU7Kao4fZY1OA",
    authDomain: "hss-id-card.firebaseapp.com",
    projectId: "hss-id-card",
    storageBucket: "hss-id-card.appspot.com",
    messagingSenderId: "22345350913",
    appId: "1:22345350913:web:b07509eef5a3cfeec9e500",
    measurementId: "G-MT8GW71R49"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

// ---- Shared application state (single source of truth) ----
const state = {
    allStudents:       [],
    currentView:       'student',
    compressedPhotoBase64: '',
    editModalPhotoData: null,
    currentlyEditingId: null,
    qrScanner:         null,
    lastScannedId:     null,
    scanTimeout:       null,
    attendanceListener: null,
    selectedDate:      new Date(),
    classChart:        null,
    reportPieChart:    null,
    importFileData:    null,
};

// ---- Shared helper: compress image ----
function compressImage(file, maxWidth, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale  = maxWidth / img.width;
            canvas.width  = img.width > maxWidth ? maxWidth : img.width;
            canvas.height = img.width > maxWidth ? img.height * scale : img.height;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.9));
        };
    };
}

// ---- Shared helper: generate QR code ----
function generateQrCode(element, text) {
    if (!element) return;
    element.innerHTML = '';
    new QRCode(element, { text: String(text), width: 70, height: 70, correctLevel: QRCode.CorrectLevel.M });
}

export {
    app, db, auth, state,
    compressImage, generateQrCode,
    // Firestore helpers re-exported so modules don't re-import Firebase themselves
    collection, onSnapshot, doc, deleteDoc, updateDoc,
    query, orderBy, addDoc, runTransaction, serverTimestamp, where, getDocs, limit,
    signInWithEmailAndPassword, onAuthStateChanged, signOut
};