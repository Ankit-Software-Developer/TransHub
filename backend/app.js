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

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
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
