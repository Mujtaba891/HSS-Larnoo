import { db } from '../app.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COLLECTION_NAME = 'contact_messages';

export const MessagesView = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <h1>Contact Messages</h1>
            </div>

            <div class="gov-card">
                <h2><i class="fas fa-envelope-open-text"></i> Received Messages</h2>
                <div id="messages-section">
                    <p class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading messages...</p>
                </div>
            </div>
        `;

        this.fetchMessages();
    },

    async fetchMessages() {
        const section = document.getElementById('messages-section');
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                section.innerHTML = '<p class="text-center">No messages found.</p>';
                return;
            }

            let html = `
                <div class="gov-table-container">
                    <table class="gov-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Sender</th>
                                <th>Email</th>
                                <th>Message</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            snapshot.forEach(doc => {
                const msg = doc.data();
                const date = msg.timestamp ? msg.timestamp.toDate().toLocaleString() : 'N/A';
                html += `
                    <tr>
                        <td style="white-space: nowrap;">${date}</td>
                        <td style="white-space: nowrap;"><strong>${this.escape(msg.name)}</strong></td>
                        <td><a href="mailto:${this.escape(msg.email)}">${this.escape(msg.email)}</a></td>
                        <td><div style="max-height: 100px; overflow-y: auto; font-size: 0.9rem;">${this.escape(msg.message)}</div></td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
            section.innerHTML = html;

        } catch (e) {
            section.innerHTML = `<p class="text-danger">Error: ${e.message}</p>`;
        }
    },

    escape(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
