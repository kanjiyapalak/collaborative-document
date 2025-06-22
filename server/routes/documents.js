const express = require('express');
const jwt = require('jsonwebtoken');
const Document = require('../models/Document');
const router = express.Router();

const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send('Token missing');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).send('Invalid token');
  }
};

router.get('/', authMiddleware, async (req, res) => {
  const docs = await Document.find({ userId: req.user.id });
  res.json(docs);
});

router.post('/', authMiddleware, async (req, res) => {
  const { title, content } = req.body;
  const newDoc = new Document({ title, content, userId: req.user.id });
  await newDoc.save();
  res.status(201).json(newDoc);
});

module.exports = router;
