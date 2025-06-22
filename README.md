# 📄 Real-Time Collaborative Document Editor

A real-time collaborative document editor where multiple users can:

- Sign up and log in
- Create a new document or join an existing one using a document code
- Collaborate on the same document in real time
- Download the document to their PC

Built with:
- ⚙ Node.js, Express.js for backend
- 💬 Socket.io for real-time sync
- 💾 MongoDB for storing users and documents
- 🌐 HTML, CSS, JavaScript for frontend

---

## 🚀 Features

- ✅ User Authentication (Signup/Login)
- 📝 Create or join document with a unique code
- 🔁 Real-time editing using WebSockets (Socket.io)
- 💾 Download edited documents
- 🔐 Secure password hashing and session handling

---

## 🛠 Tech Stack

| Tech         | Purpose                    |
|--------------|----------------------------|
| Node.js      | Backend runtime            |
| Express.js   | Web framework              |
| MongoDB      | Database                   |
| Socket.io    | Real-time collaboration    |
| HTML/CSS/JS  | Frontend UI                |

---

## 📁 Project Structure


COLLAB_DOC_EDITOR/
├── client/
│   ├── index.html
│   ├── login.html
│   ├── signup.html
│   ├── style.css
│   └── js/
│       ├── login.js
│       ├── signup.js
│       └── index.js
├── server/
│   ├── index.js
│   ├── server.js
│   ├── models/
│   │   └── (User.js, Document.js)
│   └── routes/
│       └── (auth.js, document.js)
├── .env
├── package.json
├── package-lock.json
└── README.md


---

## 📦 Installation & Setup

Follow these steps to get the project running locally:

### 1. Clone the Repository

bash
git clone https://github.com/kanjiyapalak/collaboration-document.git
cd collab-doc-editor


### 2. Install Dependencies

bash
cd server
npm install


### 3. Create Environment File

Inside the server/ folder, create a .env file:

env
MONGO_URI=your_mongodb_connection_string
PORT=3000


Replace your_mongodb_connection_string with your actual MongoDB URI.

### 4. Start the Server

bash
node server.js


Your server will run at:  
👉 http://localhost:3000

### 5. Open Frontend

Open client/index.html in your browser to start using the app.

---

## 🖥 How to Use

1. Sign up or log in
2. Create a new document or enter an existing code
3. Collaborate in real time with others
4. Download the document when you're done

---

## 📸 Screenshots

![{5A115AA2-360B-42CA-A12A-089FA99298E0}](https://github.com/user-attachments/assets/7c3db432-3e74-4f63-bd37-c95b59664bb4)
![{2BFF34C0-6275-4FFE-BB48-7896E3FCA13A}](https://github.com/user-attachments/assets/72e7d0fe-47c6-4fa9-82ce-0e615d25dfb8)
![{9BC51DE4-2178-4D35-AE3F-744EA6C7689F}](https://github.com/user-attachments/assets/77215d07-0b3f-4613-b6db-1d712810e116)







## 🔐 Security Features

- Passwords hashed using *bcrypt*
- MongoDB for secure data storage
- Socket.io used over secure WebSocket protocol

---


---

## 📃 License

Licensed under the *MIT License*

---

## 📬 Contact

*Author:* kanjiya palak 
📧 kanjiyapalak@gmail.com 
🔗 GitHub: [https://github.com/kanjiyapalak](https://github.com/kanjiyapalak)
