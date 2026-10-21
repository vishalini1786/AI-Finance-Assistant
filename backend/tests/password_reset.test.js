// password_reset.test.js
// Verification for Phase 5: Password Reset Flow, Token Hashing, Single-Use Invalidation, and Email Service

const crypto = require('crypto');
const authService = require('../src/services/authService');
const userRepository = require('../src/repositories/userRepository');
const passwordResetRepository = require('../src/repositories/passwordResetRepository');
const emailService = require('../src/services/emailService');
const { comparePassword } = require('../src/utils/password');

describe('Phase 5 — Password-Reset Token & Delivery Security Tests', () => {
  const testUser = {
    user_id: 9999,
    name: 'Test Recovery User',
    email: 'recovery_test@example.com',
    password_hash: '$2b$10$abcdefghijklmnopqrstuv',
  };

  let createdTokens = [];
  let sentEmails = [];

  beforeAll(() => {
    // Mock user lookup with case insensitivity
    jest.spyOn(userRepository, 'findByEmail').mockImplementation(async (email) => {
      if (email && email.toLowerCase().trim() === testUser.email.toLowerCase()) {
        return testUser;
      }
      return null;
    });

    // Mock token creation & storage
    jest.spyOn(passwordResetRepository, 'createResetToken').mockImplementation(async ({ userId, tokenHash, expiresAt }) => {
      const record = {
        id: createdTokens.length + 1,
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
      };
      createdTokens.push(record);
      return record;
    });

    // Mock finding valid token
    jest.spyOn(passwordResetRepository, 'findValidToken').mockImplementation(async (tokenHash) => {
      const found = createdTokens.find(t => t.token_hash === tokenHash && !t.used && new Date(t.expires_at) > new Date());
      return found || null;
    });

    // Mock marking token used
    jest.spyOn(passwordResetRepository, 'markTokenUsed').mockImplementation(async (tokenHash) => {
      const found = createdTokens.find(t => t.token_hash === tokenHash);
      if (found) found.used = true;
    });

    // Mock password update
    jest.spyOn(passwordResetRepository, 'updateUserPassword').mockImplementation(async (userId, passwordHash) => {
      if (userId === testUser.user_id) {
        testUser.password_hash = passwordHash;
        return { user_id: userId, email: testUser.email, name: testUser.name };
      }
      return null;
    });

    // Mock email dispatch
    jest.spyOn(emailService, 'sendPasswordResetEmail').mockImplementation(async ({ email, name, resetUrl }) => {
      sentEmails.push({ email, name, resetUrl });
      return { messageId: 'test-msg-123', accepted: [email] };
    });
  });

  beforeEach(() => {
    createdTokens = [];
    sentEmails = [];
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('requestPasswordReset generates secure token and dispatches to exact normalized email', async () => {
    // Request with uppercase/whitespace email
    const result = await authService.requestPasswordReset('  RECOVERY_TEST@EXAMPLE.COM  ');

    expect(result).toBeDefined();
    expect(result.message).toContain('password reset instructions have been sent');

    // Token stored in database repository must be SHA-256 hashed
    expect(createdTokens.length).toBe(1);
    const tokenRecord = createdTokens[0];
    expect(tokenRecord.user_id).toBe(testUser.user_id);
    expect(tokenRecord.token_hash).toHaveLength(64); // SHA-256 hex string length
    expect(new Date(tokenRecord.expires_at).getTime()).toBeGreaterThan(Date.now());

    // Email dispatched must match normalized account email
    expect(sentEmails.length).toBe(1);
    expect(sentEmails[0].email).toBe('recovery_test@example.com');
    expect(sentEmails[0].name).toBe('Test Recovery User');
    expect(sentEmails[0].resetUrl).toContain('/reset-password?token=');

    // The raw token from URL when hashed must equal tokenRecord.token_hash
    const rawToken = sentEmails[0].resetUrl.split('token=')[1];
    const computedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    expect(computedHash).toBe(tokenRecord.token_hash);
  });

  test('requestPasswordReset returns safe message without throwing or leaking on non-existent account', async () => {
    const result = await authService.requestPasswordReset('nonexistent@example.com');
    expect(result.message).toContain('password reset instructions have been sent');
    expect(createdTokens.length).toBe(0);
    expect(sentEmails.length).toBe(0);
  });

  test('resetPassword verifies token hash, updates password with bcrypt, and enforces single-use', async () => {
    // 1. Request reset to generate a token
    await authService.requestPasswordReset(testUser.email);
    expect(sentEmails.length).toBe(1);
    const rawToken = sentEmails[0].resetUrl.split('token=')[1];

    // 2. Perform reset with new password
    const newPass = 'BrandNewSecretPass123!';
    const resetResult = await authService.resetPassword({ token: rawToken, newPassword: newPass });
    expect(resetResult.message).toContain('Password has been successfully reset');

    // Password must be hashed with bcrypt, and comparePassword must return true
    const matches = await comparePassword(newPass, testUser.password_hash);
    expect(matches).toBe(true);

    // 3. Second attempt with the SAME token MUST fail (Single-use enforcement)
    await expect(authService.resetPassword({ token: rawToken, newPassword: 'AnotherPassword999!' }))
      .rejects.toThrow('Password reset token is invalid or has expired');
  });

  test('resetPassword rejects passwords shorter than 8 characters', async () => {
    await expect(authService.resetPassword({ token: 'dummy_token', newPassword: 'short' }))
      .rejects.toThrow('New password must be at least 8 characters long');
  });

  test('emailService exposes transporter mode without exposing credentials', () => {
    const mode = emailService.getTransporterMode();
    expect(mode).toBeDefined();
    expect(mode.from).toBeDefined();
    // Must never contain sensitive password
    expect(mode).not.toHaveProperty('pass');
    expect(mode).not.toHaveProperty('SMTP_PASS');
  });
});
