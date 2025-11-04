process.env.NODE_ENV = 'test';
process.env.REPLIT_CLIENT_ID = 'test-client-id';
process.env.REPLIT_CLIENT_SECRET = 'test-client-secret';
process.env.REPLIT_REDIRECT_URI = 'http://localhost:3000/auth/replit/callback';
process.env.DB_PATH = ':memory:';

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};