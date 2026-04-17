# HSS Larnoo - ID & Attendance System

The ID System is a comprehensive platform for managing student identification, tracking attendance, and generating academic reports for Govt. HSS Larnoo.

## 🚀 Technologies Used
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES Modules)
- **Backend:** [Firebase](https://firebase.google.com/) (Auth, Firestore)
- **Data Visualization:** [Chart.js](https://www.chartjs.org/)
- **Utility Libraries:**
  - `html2canvas`: For converting ID cards to images.
  - `jsPDF`: For generating bulk ID card PDFs.
  - `SheetJS (XLSX)`: For Excel import/export functionality.
  - `QRCode.js`: For generating student QR codes.
  - `Html5-QRCode`: For the web-based QR scanner.

## ✨ Key Features

### 1. Student Portal
- **ID Generation:** Students can fill in their details (Name, Parentage, Class, Roll No, etc.) and upload a photo to generate their digital ID card.
- **Photo Compression:** Automatic client-side image compression to optimize storage.
- **Find ID:** Students can retrieve their registered ID card using their unique ID number.
- **Download/Share:** Instant download of the ID card as a high-quality image.

### 2. Admin Panel
- **Dashboard:** Visual analytics showing student distribution across different classes.
- **Student Management:** Search, filter, edit, and delete student records.
- **Bulk Import:** Upload student data from Excel spreadsheets.
- **Bulk Export:** Export student records to Excel for backup or reporting.
- **Bulk Print:** Generate print-ready PDFs with multiple ID cards per A4 page.

### 3. Attendance System
- **QR Scanner:** Real-time attendance tracking via QR code scanning.
- **Daily Logs:** Automatic logging of attendance with timestamps.
- **Percentage Tracking:** Live calculation of daily attendance percentages.

### 4. Reports
- **Monthly Student Reports:** Detailed attendance history for individual students.
- **Class-wise Statistics:** Comparative charts and lists of class attendance performance.

## 🛠️ How to Use

### For Students:
1. Navigate to the **Student Portal**.
2. Fill out the registration form and upload a clear passport-size photo.
3. Click **Generate & Submit** to create your card.
4. Download the card for your records.

### For Admin:
1. Navigate to the **Admin Panel** and log in with authorized credentials.
2. **Management:** Use the "Manage Students" tab to view or edit existing records.
3. **Bulk Actions:** Use the "Bulk Actions" tab to import data from Excel or generate bulk PDFs for printing.
4. **Attendance:** Open the "Attendance" view to start scanning student QR codes as they arrive.
5. **Reports:** Check the "Reports" view for monthly insights and statistics.

## 📱 PWA Support
This system is PWA-ready, meaning it can be installed on mobile devices for quick access to the scanner and student portal.
