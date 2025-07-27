const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Your VPS app URL (without SSL)
const TARGET_URL = process.env.TARGET_URL || 'http://your-vps-ip:port';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for proxy
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    proxy_target: TARGET_URL 
  });
});

// Proxy configuration
const proxyOptions = {
  target: TARGET_URL,
  changeOrigin: true,
  secure: false, // Since your VPS doesn't have SSL
  followRedirects: true,
  timeout: 90000,
  proxyTimeout: 90000,
  
  // Handle WebSocket connections if needed
  ws: true,
  
  // Log proxy events
  onError: (err, req, res) => {
    console.error('Proxy Error:', err.message);
    res.status(500).json({ 
      error: 'Proxy Error', 
      message: 'Unable to connect to target server' 
    });
  },
  
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.url} to ${TARGET_URL}`);
  },
  
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Response: ${proxyRes.statusCode} for ${req.url}`);
  }
};

// Create proxy middleware
const proxy = createProxyMiddleware(proxyOptions);

// Apply proxy to all routes except health check
app.use('/', (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  proxy(req, res, next);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
  console.log(`📡 Proxying requests to: ${TARGET_URL}`);
  console.log(`🏥 Health check available at: /health`);
});

// Handle WebSocket upgrade
const server = require('http').createServer(app);
server.on('upgrade', proxy.upgrade);