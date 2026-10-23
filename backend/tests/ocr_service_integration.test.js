const fs = require('fs');
const path = require('path');
const { getOcrDiagnostics, requestOcr } = require('../src/services/documentService');
const { validateUploadedFile, MAX_FILE_SIZE } = require('../src/middleware/uploadMiddleware');
const env = require('../src/config/env');

describe('OCR Service Configuration and Diagnostics', () => {
  const originalAiServiceUrl = env.aiServiceUrl;

  afterEach(() => {
    env.aiServiceUrl = originalAiServiceUrl;
  });

  describe('Configuration validation & diagnostics', () => {
    it('returns UNCONFIGURED status when AI_SERVICE_URL is not set', async () => {
      env.aiServiceUrl = null;
      const diag = await getOcrDiagnostics();
      expect(diag.configured).toBe(false);
      expect(diag.reachable).toBe(false);
      expect(diag.status).toBe('UNCONFIGURED');
      expect(diag.message).toContain('OCR service is not configured');
    });

    it('returns UNAVAILABLE status when AI_SERVICE_URL points to a dead port', async () => {
      env.aiServiceUrl = 'http://127.0.0.1:59999';
      const diag = await getOcrDiagnostics();
      expect(diag.configured).toBe(true);
      expect(diag.reachable).toBe(false);
      expect(diag.status).toBe('UNAVAILABLE');
    });

    it('returns OPERATIONAL status when pointing to the active FastAPI OCR service', async () => {
      env.aiServiceUrl = 'http://localhost:8000';
      const diag = await getOcrDiagnostics();
      expect(diag.configured).toBe(true);
      expect(diag.reachable).toBe(true);
      expect(diag.status).toBe('OPERATIONAL');
      expect(diag.details.ocrAvailable).toBe(true);
      expect(diag.details.tesseractAvailable).toBe(true);
    });
  });

  describe('requestOcr behavior', () => {
    it('returns 503 with helpful instructions when AI_SERVICE_URL is missing', async () => {
      env.aiServiceUrl = null;
      const res = await requestOcr({ path: 'dummy.png', originalname: 'dummy.png', mimetype: 'image/png' });
      expect(res.status).toBe('UNAVAILABLE');
      expect(res.statusCode).toBe(503);
      expect(res.message).toBe('OCR service is not configured. Set AI_SERVICE_URL in the backend environment and restart the API.');
    });

    it('handles unreachable service gracefully with 503 status', async () => {
      env.aiServiceUrl = 'http://127.0.0.1:59999';
      const tmpFile = path.join(__dirname, 'test_receipt_dummy.png');
      fs.writeFileSync(tmpFile, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]));
      try {
        const res = await requestOcr({ path: tmpFile, originalname: 'test.png', mimetype: 'image/png' });
        expect(res.status).toBe('UNAVAILABLE');
        expect(res.statusCode).toBe(503);
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });
  });

  describe('Upload middleware security & validation', () => {
    it('rejects files larger than 10MB limit', () => {
      expect(() =>
        validateUploadedFile(
          { originalname: 'receipt.png', mimetype: 'image/png' },
          Buffer.alloc(MAX_FILE_SIZE + 1)
        )
      ).toThrow('10MB');
    });

    it('rejects unsupported extensions', () => {
      expect(() =>
        validateUploadedFile(
          { originalname: 'script.exe', mimetype: 'application/octet-stream' },
          Buffer.from('mz...')
        )
      ).toThrow();
    });
  });
});
