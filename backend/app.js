// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const v1Router = require('./src/routes/v1');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// Security and utility middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

const defaultAllowedOrigins = [
  'http://187.127.157.120:3005',
  'http://187.127.157.120:3000',
  'http://localhost:3000',
  'http://localhost:3005',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3005',
];

const getAllowedOrigins = () => {
  const envList = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((u) => u.trim().replace(/\/$/, '')).filter(Boolean)
    : [];
  return Array.from(new Set([...defaultAllowedOrigins, ...envList]));
};

// Handle Chrome Private Network Access preflights
app.use((req, res, next) => {
  if (req.headers['access-control-request-private-network']) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    const allowed = getAllowedOrigins();
    if (allowed.includes(normalizedOrigin) || allowed.includes('*')) {
      return callback(null, true);
    }
    // Reflect origin to support all staging IPs / local dev ports with credentials
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));

app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date(),
    service: 'TransporterTMS API',
    version: '1.0.0',
  });
});

// Mount v1 REST APIs
app.use('/api/v1', v1Router);

// Central error handler
app.use(errorHandler);

module.exports = app;
