// server.js
const http = require('http');
const app = require('./app');
const { testDbConnection } = require('./src/config/database');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io for real-time tracking updates
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
});

io.on('connection', (socket) => {
  // Join organization room for real-time push events
  socket.on('join_org', (orgId) => {
    socket.join(`org_${orgId}`);
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// Attach io instance to app
app.set('io', io);

const { initMasterDatabase } = require('./src/config/initDatabase');

const startServer = async () => {
  const isConnected = await testDbConnection();
  if (!isConnected) {
    console.error('❌ Server startup aborted due to MySQL connection failure.');
    process.exit(1);
  }

  // Automatically check, create, and verify all database tables, columns, and seed records
  try {
    await initMasterDatabase();
  } catch (dbInitErr) {
    console.error('⚠️ Database table initialization warning:', dbInitErr.message);
  }

  server.listen(PORT, () => {
    console.log(`🚀 TransporterTMS Backend Server running on http://localhost:${PORT}`);
    console.log(`📡 REST API mounted at http://localhost:${PORT}/api/v1`);
    console.log(`🩺 Health check at http://localhost:${PORT}/api/health`);
  });
};

startServer();
