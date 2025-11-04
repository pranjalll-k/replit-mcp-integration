const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { BaseSuccessResponseDto, BaseErrorResponseDto, JsonResponseData } = require('../lib/responses');
const { info, error } = require('../utils/logging');

const router = express.Router();

function initializeDB() {
  const dbPath = process.env.DB_PATH || './src/db/tokens.sqlite';
  const db = new sqlite3.Database(dbPath);
  
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS oauth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`);
  });
  
  return db;
}

function storeToken(userId, accessToken, refreshToken = null, expiresIn = null) {
  const db = initializeDB();
  const expiresAt = expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : null;
  
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO oauth_tokens 
      (user_id, access_token, refresh_token, expires_at, updated_at) 
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `);
    
    stmt.run([userId, accessToken, refreshToken, expiresAt], function(err) {
      if (err) {
        error('Failed to store token', { error: err.message, userId });
        reject(err);
      } else {
        info('Token stored successfully', { userId });
        resolve();
      }
      db.close();
    });
  });
}

function getToken(userId) {
  const db = initializeDB();
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM oauth_tokens WHERE user_id = ?',
      [userId],
      (err, row) => {
        if (err) {
          error('Failed to retrieve token', { error: err.message, userId });
          reject(err);
        } else {
          resolve(row);
        }
        db.close();
      }
    );
  });
}

router.get('/auth/replit', (req, res) => {
  const clientId = process.env.REPLIT_CLIENT_ID;
  const redirectUri = process.env.REPLIT_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return res.status(500).json(new BaseErrorResponseDto('OAuth configuration missing', 500));
  }

  const authURL = `https://replit.com/oauth/authorize?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=read write exec`;

  info('OAuth flow initiated', { authURL });
  
  res.json(new BaseSuccessResponseDto(
    new JsonResponseData({
      authURL,
      message: 'Visit the authURL to authorize this application with Replit'
    })
  ));
});

router.get('/auth/replit/callback', async (req, res) => {
  const { code, error: oauthError } = req.query;

  if (oauthError) {
    error('OAuth callback error', { error: oauthError });
    return res.status(400).json(new BaseErrorResponseDto(`OAuth error: ${oauthError}`, 400));
  }

  if (!code) {
    return res.status(400).json(new BaseErrorResponseDto('Missing authorization code', 400));
  }

  try {
    const clientId = process.env.REPLIT_CLIENT_ID;
    const clientSecret = process.env.REPLIT_CLIENT_SECRET;
    const redirectUri = process.env.REPLIT_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('OAuth configuration incomplete');
    }

    const tokenResponse = await axios.post('https://replit.com/oauth/token', {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const userResponse = await axios.post('https://replit.com/graphql', {
      query: `
        query GetCurrentUser {
          currentUser {
            id
            username
            email
            displayName
          }
        }
      `
    }, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const userData = userResponse.data.data.currentUser;
    if (!userData) {
      throw new Error('Failed to fetch user data');
    }

    await storeToken(userData.id, access_token, refresh_token, expires_in);

    info('OAuth callback successful', { userId: userData.id, username: userData.username });

    res.json(new BaseSuccessResponseDto(
      new JsonResponseData({
        message: 'Authorization successful',
        user: userData,
        accessToken: access_token
      })
    ));

  } catch (err) {
    error('OAuth callback failed', { error: err.message });
    res.status(500).json(new BaseErrorResponseDto(`OAuth callback failed: ${err.message}`, 500));
  }
});

router.get('/auth/token/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const tokenData = await getToken(userId);
    
    if (!tokenData) {
      return res.status(404).json(new BaseErrorResponseDto('No token found for user', 404));
    }

    const now = Math.floor(Date.now() / 1000);
    const isExpired = tokenData.expires_at && tokenData.expires_at < now;

    res.json(new BaseSuccessResponseDto(
      new JsonResponseData({
        hasToken: true,
        isExpired,
        expiresAt: tokenData.expires_at
      })
    ));

  } catch (err) {
    error('Failed to check token', { error: err.message, userId });
    res.status(500).json(new BaseErrorResponseDto(`Failed to check token: ${err.message}`, 500));
  }
});

module.exports = router;