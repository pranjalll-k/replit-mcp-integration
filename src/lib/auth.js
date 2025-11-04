const { BaseErrorResponseDto } = require('./responses');

function validateReplitToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(new BaseErrorResponseDto('Missing or invalid Authorization header', 401));
  }

  const token = authHeader.substring(7);
  if (!token) {
    return res.status(401).json(new BaseErrorResponseDto('Missing Replit access token', 401));
  }

  req.replitToken = token;
  next();
}

function extractOptionalReplitToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token) {
      req.replitToken = token;
    }
  }

  next();
}

module.exports = {
  validateReplitToken,
  extractOptionalReplitToken
};