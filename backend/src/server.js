/**
 * src/server.js
 * Main Express application entry point for the RPM backend API.
 * Connects to MongoDB, mounts all routes, and starts the HTTP server.
 */
'use strict';

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const AppError = require('./utils/AppError');

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Route imports
// ---------------------------------------------------------------------------
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const deviceRoutes = require('./routes/devices');
const readingRoutes = require('./routes/readings');
const iotRoutes = require('./routes/iot');
const recommendationRoutes = require('./routes/recommendations');
const alertRoutes = require('./routes/alerts');
const feedbackRoutes = require('./routes/feedback');
const mlRoutes = require('./routes/ml');
const adminRoutes = require('./routes/admin');

// ---------------------------------------------------------------------------
// App initialisation
// ---------------------------------------------------------------------------
const app = express();

// ---------------------------------------------------------------------------
// Security & request parsing middleware
// ---------------------------------------------------------------------------

/** Set security-related HTTP headers */
app.use(helmet());

/** Restrict CORS to the configured frontend origins */
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/** HTTP request logger (dev format in development, combined in production) */
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

/** Parse JSON bodies (up to 10kb to prevent abuse) */
app.use(express.json({ limit: '10kb' }));

// ---------------------------------------------------------------------------
// Health check (unauthenticated)
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Remote Patient Monitoring API',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// API route mounting
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/admin', adminRoutes);

// ---------------------------------------------------------------------------
// Catch-all for unknown routes
// ---------------------------------------------------------------------------
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server.`, 404));
});

// ---------------------------------------------------------------------------
// Global error handling middleware
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  // Default to internal server error
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log non-operational (unexpected) errors
  if (!err.isOperational) {
    console.error('UNEXPECTED ERROR:', err);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      status: 'fail',
      message: messages.join('. '),
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      status: 'fail',
      message: `Duplicate value for ${field}. Please use a different value.`,
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'fail',
      message: `Invalid ${err.path}: "${err.value}".`,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ status: 'fail', message: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ status: 'fail', message: 'Token expired.' });
  }

  // Operational errors: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Programming/unexpected errors: don't leak details in production
  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again later.'
      : err.message,
  });
});

// ---------------------------------------------------------------------------
// MongoDB connection + server startup
// ---------------------------------------------------------------------------
const DEFAULT_PORT = Number(process.env.PORT) || 5000;
const PORT_CANDIDATES = Array.from({ length: 10 }, (_, index) => DEFAULT_PORT + index);

function startListening(port, portIndex = 0) {
  const server = app.listen(port, () => {
    console.log(`🚀 RPM API server running on port ${port}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://localhost:${port}/api/health`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && portIndex < PORT_CANDIDATES.length - 1) {
      console.warn(`⚠️  Port ${port} is busy. Retrying on ${PORT_CANDIDATES[portIndex + 1]}...`);
      server.close(() => startListening(PORT_CANDIDATES[portIndex + 1], portIndex + 1));
      return;
    }

    console.error(`❌ Failed to start server on port ${port}:`, error.message);
    process.exit(1);
  });
}

async function startServer() {
  const isPlaceholder =
    !process.env.MONGODB_URI ||
    process.env.MONGODB_URI.includes('username:password') ||
    process.env.MONGODB_URI.includes('cluster.mongodb.net/rpm_db');

  let connected = false;

  // 1. Try configured URI if not placeholder
  if (!isPlaceholder) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB via MONGODB_URI.');
      connected = true;
    } catch (err) {
      console.warn(`⚠️  Could not connect to external MongoDB: ${err.message}`);
      console.log('🔄 Falling back to embedded MongoMemoryServer...');
    }
  }

  // 2. Fall back to MongoMemoryServer for instant zero-config runtime
  if (!connected) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      await mongoose.connect(memoryUri);
      console.log('✅ Connected to embedded MongoMemoryServer.');
      connected = true;
    } catch (err) {
      console.error('❌ Failed to start embedded MongoDB:', err.message);
      process.exit(1);
    }
  }

  // 3. Auto-seed if database has no users
  try {
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Database is empty — running initial seed...');
      const { populateSeedData } = require('../seed');
      await populateSeedData();
    }
  } catch (err) {
    console.warn('⚠️  Auto-seed skipped or encountered notice:', err.message);
  }

  // 4. Start HTTP Server with graceful port fallback
  startListening(PORT_CANDIDATES[0]);
}

startServer();

module.exports = app; // Export for testing
