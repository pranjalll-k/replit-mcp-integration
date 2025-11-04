require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const { BaseErrorResponseDto } = require('./lib/responses');
const { info, error } = require('./utils/logging');

const toolsRouter = require('./routes/tools');
const authRouter = require('./routes/auth');
const resourceRouter = require('./routes/resource');
const mcpRouter = require('./routes/mcp');

const app = express();
const PORT = process.env.PORT || 3000;

function ensureDbDirectory() {
  const dbDir = path.dirname(process.env.DB_PATH || './src/db/tokens.sqlite');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    info('Database directory created', { path: dbDir });
  }
}

function validateEnvironment() {
  // For now, we'll make OAuth optional and just warn if missing
  const oauthVars = ['REPLIT_CLIENT_ID', 'REPLIT_CLIENT_SECRET', 'REPLIT_REDIRECT_URI'];
  const missing = oauthVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  OAuth not configured. Missing: ${missing.join(', ')}`);
    console.warn('OAuth endpoints will not work until configured.');
    console.warn('Tools endpoints will work with manually provided Replit tokens.');
  }
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: new BaseErrorResponseDto('Too many requests, please try again later', 429),
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

app.get('/', (req, res) => {
  res.json({
    name: 'Replit Deploy Agent',
    version: '1.0.0',
    description: 'Production-ready agent to integrate Replit with Bhindi.io',
    endpoints: {
      'GET /tools': 'List available tools',
      'POST /tools/:toolName': 'Execute a specific tool',
      'POST /resource': 'Get user context and project info',
      'GET /auth/replit': 'Initiate OAuth flow',
      'GET /auth/replit/callback': 'OAuth callback endpoint',
      'GET /health': 'Health check endpoint'
    },
    documentation: 'See README.md for setup and usage instructions'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/', toolsRouter);
app.use('/', authRouter);
app.use('/', resourceRouter);
app.use('/mcp', mcpRouter);

app.use('*', (req, res) => {
  res.status(404).json(new BaseErrorResponseDto(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

app.use((err, req, res, next) => {
  error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(new BaseErrorResponseDto('Invalid JSON in request body', 400));
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json(new BaseErrorResponseDto('Request entity too large', 413));
  }

  res.status(500).json(new BaseErrorResponseDto('Internal server error', 500));
});

function gracefulShutdown(signal) {
  info(`Received ${signal}, shutting down gracefully`);
  
  const server = app.listen(PORT);
  server.close(() => {
    info('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

function startServer() {
  try {
    validateEnvironment();
    ensureDbDirectory();
    
    app.listen(PORT, () => {
      info('Replit Deploy Agent started', { 
        port: PORT, 
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      });
      
      console.log(`🚀 Replit Deploy Agent running on port ${PORT}`);
      console.log(`📚 API documentation: http://localhost:${PORT}/`);
      console.log(`❤️  Health check: http://localhost:${PORT}/health`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔧 OAuth setup: http://localhost:${PORT}/auth/replit`);
      }
    });
  } catch (err) {
    error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

startServer();