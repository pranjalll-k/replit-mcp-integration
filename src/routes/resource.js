const express = require('express');
const { extractOptionalReplitToken } = require('../lib/auth');
const { BaseSuccessResponseDto, BaseErrorResponseDto, JsonResponseData } = require('../lib/responses');
const { ReplitAPI } = require('../lib/replit');
const { info, error } = require('../utils/logging');

const router = express.Router();

router.post('/resource', extractOptionalReplitToken, async (req, res) => {
  info('POST /resource requested', { hasToken: !!req.replitToken });

  if (!req.replitToken) {
    return res.json(new BaseSuccessResponseDto(
      new JsonResponseData({
        connected: false,
        message: 'No Replit token provided. Use /auth/replit to connect your account.'
      })
    ));
  }

  try {
    const replitAPI = new ReplitAPI(req.replitToken);
    
    const [currentUser, userRepls] = await Promise.all([
      replitAPI.getCurrentUser(),
      replitAPI.getUserRepls()
    ]);

    const projects = userRepls.map(repl => ({
      title: repl.title,
      id: repl.id,
      url: repl.url,
      language: repl.language,
      isPrivate: repl.isPrivate
    }));

    const resourceData = {
      connected: true,
      replitUser: {
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email || null,
        displayName: currentUser.displayName || currentUser.username
      },
      projects,
      stats: {
        totalProjects: projects.length,
        publicProjects: projects.filter(p => !p.isPrivate).length,
        privateProjects: projects.filter(p => p.isPrivate).length
      }
    };

    info('Resource data retrieved successfully', { 
      userId: currentUser.id, 
      projectCount: projects.length 
    });

    res.json(new BaseSuccessResponseDto(new JsonResponseData(resourceData)));

  } catch (err) {
    error('Failed to retrieve resource data', { error: err.message });
    
    if (err.message.includes('401') || err.message.includes('unauthorized')) {
      res.status(401).json(new BaseErrorResponseDto('Invalid or expired Replit token', 401));
    } else {
      res.status(500).json(new BaseErrorResponseDto(`Failed to retrieve resource data: ${err.message}`, 500));
    }
  }
});

module.exports = router;