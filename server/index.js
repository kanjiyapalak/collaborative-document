require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const User = require('./models/User');
const Document = require('./models/Document');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Adjust as needed for production
        methods: ["GET", "POST"]
    }
});

// Map to track active users per document: docId -> Set of usernames
const activeUsersByDoc = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..' ,'client'))); // Serve static files from the client directory using absolute path

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// --- Auth Routes ---

// Signup
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user = new User({ username, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ message: 'User registered successfully', token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Logged in successfully', token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Auth check middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('SERVER: Auth header received:', authHeader); // Log the full header
    console.log('SERVER: Token extracted:', token ? token.substring(0, 10) + '...' : 'No token'); // Log first 10 chars

    if (token == null) {
        console.log('SERVER: No token provided, sending 401');
        return res.sendStatus(401); // No token
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('SERVER: Token verification failed, sending 403', err.message);
            return res.sendStatus(403); // Invalid token
        }
        req.user = user;
        console.log('SERVER: Token verified successfully for user:', user.username);
        next();
    });
};

app.get('/checkAuth', authenticateToken, (req, res) => {
    res.status(200).json({ message: 'Authenticated', user: req.user });
});

// --- Socket.IO for real-time document editing ---

io.on('connection', socket => {
    console.log('SERVER: A user connected!', socket.id);

    // Test event to confirm basic client-to-server communication
    socket.on('clientTestEvent', (message) => {
        console.log('SERVER: Received clientTestEvent:', message);
        socket.emit('serverTestEvent', 'Server received your test message!');
    });

    socket.on('joinDoc', async ({ docId, username, content }) => {
        socket.join(docId);
        console.log(`${username} joined document: ${docId}. Content length received: ${content ? content.length : 0}`);

        // Add user to active users for this document
        if (!activeUsersByDoc.has(docId)) {
            activeUsersByDoc.set(docId, new Set());
        }
        activeUsersByDoc.get(docId).add(username);

        // Load document content from DB
        let document = await Document.findOne({ docId });
        if (!document) {
            // If doc doesn't exist, it means it's a new doc creation (e.g., from 'New Document' button)
            // For uploads, content is sent via 'uploadFileContent' AFTER 'joinDoc'
            document = new Document({ docId, content: '' }); // Initialize empty for new doc
            await document.save();
            console.log(`Created new empty document: ${docId}`);
        }
        socket.emit('receiveChanges', document.content);
        console.log(`Server sending initial content to ${username} for ${docId}: length ${document.content ? document.content.length : 0}`);

        // Emit updated active users list for this document
        io.to(docId).emit('activeUsers', Array.from(activeUsersByDoc.get(docId)));

        socket.username = username; // Store username on socket for activeUsers list
        socket.docId = docId; // Store docId on socket for easier lookup on disconnect
    });

    socket.on('sendChanges', async ({ docId, content }) => {
        // Broadcast changes to all users in the same document room
        // IMPORTANT: This is a "last write wins" model. For true collaborative merging
        // (like Google Docs), more complex Operational Transformation (OT) or
        // Conflict-Free Replicated Data Types (CRDTs) would be required.
        socket.to(docId).emit('receiveChanges', content);
        console.log(`Server broadcasting changes for ${docId}: length ${content ? content.length : 0}`);

        // Save changes to DB (debounced/throttled in a real app)
        await Document.findOneAndUpdate({ docId }, { content }, { upsert: true });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected', socket.id);
        const disconnectedUsername = socket.username;
        const disconnectedDocId = socket.docId;

        if (disconnectedDocId && activeUsersByDoc.has(disconnectedDocId)) {
            activeUsersByDoc.get(disconnectedDocId).delete(disconnectedUsername);

            // If no more users in the document, remove the document from the map
            if (activeUsersByDoc.get(disconnectedDocId).size === 0) {
                activeUsersByDoc.delete(disconnectedDocId);
            }

            // Emit updated active users list for the affected document
            io.to(disconnectedDocId).emit('activeUsers', Array.from(activeUsersByDoc.get(disconnectedDocId) || new Set()));
        }
    });
});

// Serve index.html for root requests (after all API routes)
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 