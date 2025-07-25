// File: js/newsletter.js

// This script assumes Firebase is initialized on the page.
// Since you have the Firebase script on contact.html, we need it on other pages too.
// For simplicity, we'll re-initialize here. It's safe to do.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBAUBnBW_wcY3evdk4ilKVyvufkkYo6rIU",
    authDomain: "hss-larnoo-teachers.firebaseapp.com",
    projectId: "hss-larnoo-teachers",
    storageBucket: "hss-larnoo-teachers.appspot.com",
    messagingSenderId: "143363278401",
    appId: "1:143363278401:web:49d7fffbdf31ce073e68c0",
    measurementId: "G-GHQLMME6PJ"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const newsletterForm = document.querySelector('.footer-item .p-3.rounded');
    
    if (newsletterForm) {
        const emailInput = newsletterForm.querySelector('input[type="text"]');
        const signUpButton = newsletterForm.querySelector('button');

        signUpButton.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('Please enter a valid email address.');
                return;
            }

            signUpButton.disabled = true;
            signUpButton.innerText = 'Checking...';

            try {
                const subscribersRef = collection(db, "newsletter_subscribers");
                const q = query(subscribersRef, where("email", "==", email));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    await addDoc(subscribersRef, {
                        email: email,
                        subscribedAt: serverTimestamp()
                    });
                    alert(`Thank you for subscribing, ${email}!`);
                    emailInput.value = '';
                } else {
                    alert(`${email} is already subscribed.`);
                }
            } catch (error) {
                console.error("Error subscribing: ", error);
                alert("An error occurred. Please try again.");
            } finally {
                signUpButton.disabled = false;
                signUpButton.innerText = 'SignUp';
            }
        });
    }
});