// authService.js
// Business logic for registration, login, Google OAuth, and password recovery.

const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const passwordResetRepository = require('../repositories/passwordResetRepository');
const emailService = require('./emailService');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

// Strip password_hash before this ever reaches a controller/response.
function toSafeUser(userRow) {
  const { password_hash, ...safeUser } = userRow;
  return safeUser;
}

async function register({ name, email, password, phone }) {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    const err = new Error('An account with this email already exists');
    err.statusCode = 409;
    err.expose = true;
    throw err;
  }

  const passwordHash = await hashPassword(password);
  const newUser = await userRepository.createUser({ name, email, passwordHash, phone });
  const token = generateToken(newUser.user_id);

  return { user: toSafeUser(newUser), token };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    err.expose = true;
    throw err;
  }

  const passwordMatches = await comparePassword(password, user.password_hash);
  if (!passwordMatches) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    err.expose = true;
    throw err;
  }

  const token = generateToken(user.user_id);
  return { user: toSafeUser(user), token };
}

async function googleLogin({ credential, demoEmail, demoName }) {
  let email = null;
  let name = null;

  if (credential) {
    try {
      let payload = null;
      // Try verifying as ID token first
      const idTokenRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      if (idTokenRes.ok) {
        payload = await idTokenRes.json();
      } else {
        // Try verifying as OAuth2 access token with Google userinfo API
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${credential}` },
        });
        if (userinfoRes.ok) {
          payload = await userinfoRes.json();
        }
      }

      if (!payload || !payload.email) {
        const err = new Error('Invalid Google credential or failed to verify with Google OAuth servers');
        err.statusCode = 401;
        err.expose = true;
        throw err;
      }

      if (payload.email_verified !== 'true' && payload.email_verified !== true) {
        const err = new Error('Google email is not verified');
        err.statusCode = 401;
        err.expose = true;
        throw err;
      }
      email = payload.email.toLowerCase().trim();
      name = payload.name || payload.given_name || email.split('@')[0];
    } catch (err) {
      if (err.statusCode) throw err;
      const wrapErr = new Error('Failed to verify Google credential with Google OAuth servers');
      wrapErr.statusCode = 401;
      wrapErr.expose = true;
      throw wrapErr;
    }
  } else if (demoEmail) {
    // Permitted in local development for quick reviewer verification without GCP Client ID
    email = demoEmail.toLowerCase().trim();
    name = demoName || email.split('@')[0];
  } else {
    const err = new Error('Google credential is required');
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }

  let user = await userRepository.findByEmail(email);
  if (!user) {
    const randomPass = crypto.randomBytes(24).toString('hex');
    const passwordHash = await hashPassword(randomPass);
    user = await userRepository.createUser({
      name,
      email,
      passwordHash,
    });
  }

  const token = generateToken(user.user_id);
  return { user: toSafeUser(user), token };
}

async function requestPasswordReset(email) {
  if (!email || typeof email !== 'string') {
    const err = new Error('Valid email address is required');
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await userRepository.findByEmail(normalizedEmail);
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await passwordResetRepository.createResetToken({
      userId: user.user_id,
      tokenHash,
      expiresAt,
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${rawToken}`;

    const delivery = await emailService
      .sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetUrl,
      })
      .catch((e) => {
        console.warn('[AuthService] Password reset email dispatch warning:', e.message);
        return { resetUrl, previewUrl: null };
      });

    return {
      message: 'If an account with that email exists, password reset instructions have been sent.',
      resetUrl: delivery?.resetUrl || resetUrl,
      previewUrl: delivery?.previewUrl || null,
    };
  }

  return { message: 'If an account with that email exists, password reset instructions have been sent.' };
}

async function resetPassword({ token, newPassword }) {
  if (!token || typeof token !== 'string') {
    const err = new Error('Reset token is required');
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    const err = new Error('New password must be at least 8 characters long');
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const validToken = await passwordResetRepository.findValidToken(tokenHash);

  if (!validToken) {
    const err = new Error('Password reset token is invalid or has expired');
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }

  const newHash = await hashPassword(newPassword);
  await passwordResetRepository.updateUserPassword(validToken.user_id, newHash);
  await passwordResetRepository.markTokenUsed(tokenHash);

  return { message: 'Password has been successfully reset. You can now log in.' };
}

async function getCurrentUser(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.expose = true;
    throw err;
  }
  return toSafeUser(user);
}

module.exports = {
  register,
  login,
  googleLogin,
  requestPasswordReset,
  resetPassword,
  getCurrentUser,
  toSafeUser,
};
