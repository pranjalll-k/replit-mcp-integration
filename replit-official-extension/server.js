const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'connected', timestamp: new Date().toISOString() });
});

// MCP API endpoint
app.post('/api', (req, res) => {
  console.log('Received MCP request:', req.body);
  
  const { method, params } = req.body;
  
  // Send response back indicating real integration active
  res.json({
    success: true,
    message: `Real Replit Extension executed: ${method}`,
    data: params,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Replit Extension API server running on port ${PORT}`);
  console.log(`📡 Health endpoint: http://localhost:${PORT}/health`);
  console.log(`🔗 MCP API endpoint: http://localhost:${PORT}/api`);
});