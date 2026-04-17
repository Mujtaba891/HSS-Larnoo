# HSS Larnoo - Admin Portal

The Admin Portal is a secure, Single Page Application (SPA) designed for the management of Govt. Higher Secondary School (HSS) Larnoo's digital presence and student services.

## 🚀 Technologies Used
- **Frontend:** HTML5, CSS3 (Custom Government-style theme), Vanilla JavaScript (ES Modules)
- **Backend:** [Firebase](https://firebase.google.com/) (Authentication, Firestore Database)
- **PWA:** Service Workers and Web App Manifest for offline capabilities and mobile installation
- **Icons:** [FontAwesome 6](https://fontawesome.com/)
- **Fonts:** [Google Fonts (Roboto)](https://fonts.google.com/)

## ✨ Key Features
- **Secure Authentication:** Protected terminal requiring authorized admin credentials (`hsslarnoo024@gmail.com`).
- **Content Management System (CMS):**
  - **Manage Blogs:** Create and edit school blog posts.
  - **Manage Events:** Keep the community updated with upcoming events.
  - **Manage Programs:** Update academic and extra-curricular programs.
  - **Manage Notices:** Publish important announcements and circulars.
  - **Gallery Upload:** Manage and upload school photos.
- **Student Services Integration:**
  - Direct links to the **Student ID Card System**.
  - **Messages:** Handle inquiries and communications.
  - **Newsletter:** Send updates to the school's subscriber list.
- **Dashboard:** At-a-glance view of system status and quick stats.
- **Responsive Layout:** Optimized for both desktop (Sidebar navigation) and mobile (Bottom navigation bar).

## 🛠️ How to Use
1. **Access:** Open `admin/index.html` in a web browser.
2. **Login:** Use the authorized admin email and password.
3. **Navigation:**
   - Use the **Sidebar** on desktop or the **Bottom Nav** on mobile to switch between views.
   - The **"More"** menu on mobile provides access to additional tools like ID Cards and Messaging.
4. **Management:**
   - Navigate to the respective section (e.g., Blogs, Events).
   - Use the provided forms to add or update content.
   - Changes are reflected in real-time on the main school website via Firebase Firestore.

## 🔒 Security
- **Authentication:** Powered by Firebase Auth with session persistence.
- **Authorization:** Only the hardcoded admin email is allowed access.
- **Monitoring:** Failed login attempts are logged for security auditing.
