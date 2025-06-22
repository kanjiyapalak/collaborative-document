// === server.js ===
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const User = require('./models/User');
const Document = require('./models/Document');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Document change history to track operations
const documentOperations = new Map();

// Function to apply operations in order
function applyOperations(content, operations) {
  if (!content) content = '';
  if (!operations || !Array.isArray(operations)) return content;
  
  let result = content;
  operations.forEach(op => {
    if (!op || typeof op !== 'object') return;
    
    try {
      if (op.type === 'insert' && typeof op.position === 'number' && typeof op.text === 'string') {
        result = result.slice(0, op.position) + op.text + result.slice(op.position);
      } else if (op.type === 'delete' && typeof op.position === 'number' && typeof op.length === 'number') {
        result = result.slice(0, op.position) + result.slice(op.position + op.length);
      }
    } catch (error) {
      console.error('Error applying operation:', error);
    }
  });
  return result;
}

mongoose.connect('mongodb://localhost:27017/collab_editor', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/collab_editor' })
}));

app.use(express.static(path.join(__dirname, '..', 'client')));


// Authentication Routes
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const existingUser = await User.findOne({ username });
  if (existingUser) return res.status(400).json({ msg: 'User already exists' });

  const newUser = new User({ username, email, password: hashedPassword });
  await newUser.save();
  req.session.userId = newUser._id;
  res.status(200).json({ msg: 'Signup successful', username });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
  req.session.userId = user._id;
  res.status(200).json({ msg: 'Login successful', username });
});

app.get('/checkAuth', (req, res) => {
  if (req.session.userId) {
    return res.status(200).json({ loggedIn: true });
  }
  res.status(401).json({ loggedIn: false });
});

// Document handling via Socket.IO
const activeUsers = {};

io.on('connection', (socket) => {
  socket.on('joinDoc', async ({ docId, username }) => {
    if (!docId) return;

    try {
      socket.join(docId);
      if (!activeUsers[docId]) activeUsers[docId] = [];
      if (!activeUsers[docId].includes(username)) {
        activeUsers[docId].push(username);
      }

      io.to(docId).emit('activeUsers', activeUsers[docId]);

      let doc = await Document.findOne({ docId });
      if (!doc) {
        doc = new Document({ docId, content: '' });
        await doc.save();
      }

      // Send current content to the new user
      socket.emit('receiveChanges', doc.content);

      // Handle file uploads
      socket.on('uploadFile', async ({ docId, content, filename }) => {
        try {
          if (!content) {
            throw new Error('No content received');
          }

          const doc = await Document.findOne({ docId });
          if (!doc) {
            throw new Error('Document not found');
          }

          // Update the document with the file content
          await Document.findOneAndUpdate(
            { docId },
            { 
              content,
              lastModified: new Date()
            }
          );

          // Notify the uploading user
          socket.emit('fileUploaded', {
            content,
            filename
          });

          // Broadcast the changes to all other users in the room
          socket.to(docId).emit('receiveChanges', content);
        } catch (error) {
          console.error('Error uploading file:', error);
          socket.emit('syncError', { message: 'Failed to upload file' });
        }
      });

      socket.on('sendChanges', async ({ docId, content }) => {
        try {
          if (!content) {
            console.error('Invalid content received');
            return;
          }

          const doc = await Document.findOne({ docId });
          if (!doc) {
            throw new Error('Document not found');
          }

          // Update the document in the database
          await Document.findOneAndUpdate(
            { docId },
            { 
              content,
              lastModified: new Date()
            }
          );

          // Broadcast the changes to all other users in the room
          socket.to(docId).emit('receiveChanges', content);
        } catch (error) {
          console.error('Error updating document:', error);
          socket.emit('syncError', { message: 'Failed to update document' });
        }
      });

      socket.on('disconnect', () => {
        if (activeUsers[docId]) {
          activeUsers[docId] = activeUsers[docId].filter(u => u !== username);
          io.to(docId).emit('activeUsers', activeUsers[docId]);
        }
      });
    } catch (error) {
      console.error('Error in joinDoc:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  });
});

app.get('/', (req, res) => {
  res.redirect('/login.html');
});
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'signup.html'));
});


server.listen(5000, () => console.log('Server running on http://localhost:5000'));