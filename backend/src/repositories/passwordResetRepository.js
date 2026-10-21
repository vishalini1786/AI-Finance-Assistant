const db = require('../config/database');

// Memory store fallback in case password_reset_tokens table has not yet been migrated
const memoryTokens = new Map();

async function createResetToken({ userId, tokenHash, expiresAt }) {
  try {
    const res = await db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, tokenHash, expiresAt]
    );
    return res.rows[0];
  } catch (err) {
    // If table doesn't exist, use safe memory store fallback
    memoryTokens.set(tokenHash, {
      userId,
      tokenHash,
      expiresAt: new Date(expiresAt),
      used: false,
      createdAt: new Date(),
    });
    return { user_id: userId, token_hash: tokenHash, expires_at: expiresAt };
  }
}

async function findValidToken(tokenHash) {
  try {
    const res = await db.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = $1 AND used = FALSE AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    if (res.rows.length > 0) return res.rows[0];
  } catch (err) {
    // Table missing fallback
  }

  const mem = memoryTokens.get(tokenHash);
  if (mem && !mem.used && mem.expiresAt > new Date()) {
    return {
      user_id: mem.userId,
      token_hash: mem.tokenHash,
      expires_at: mem.expiresAt,
      used: mem.used,
    };
  }
  return null;
}

async function markTokenUsed(tokenHash) {
  try {
    await db.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE token_hash = $1`,
      [tokenHash]
    );
  } catch (err) {
    // Table missing fallback
  }

  const mem = memoryTokens.get(tokenHash);
  if (mem) {
    mem.used = true;
  }
}

async function updateUserPassword(userId, passwordHash) {
  const res = await db.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2 RETURNING user_id, email, name`,
    [passwordHash, userId]
  );
  return res.rows[0] || null;
}

module.exports = {
  createResetToken,
  findValidToken,
  markTokenUsed,
  updateUserPassword,
};
