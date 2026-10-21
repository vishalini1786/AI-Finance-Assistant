const {
  validateUploadedFile,
  getDetectedFormat,
  MAX_FILE_SIZE,
} = require('../src/middleware/uploadMiddleware');

describe('Document upload validation', () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  const pdf = Buffer.from('%PDF-1.7\n');

  it.each([
    ['receipt.PNG', 'image/png', png, 'png'],
    ['receipt.jpeg', 'image/jpeg', jpeg, 'jpeg'],
    ['receipt.JPG', 'image/jpg', jpeg, 'jpeg'],
    ['photo.jfif', 'image/jfif', jpeg, 'jpeg'],
    ['screenshot.png', 'image/apng', png, 'png'],
    ['receipt.pdf', 'application/pdf', pdf, 'pdf'],
    ['document.pdf', 'application/x-pdf', pdf, 'pdf'],
    ['receipt.png', 'application/octet-stream', png, 'png'],
    ['blob', 'application/octet-stream', png, 'png'],
  ])('accepts valid %s content', (originalname, mimetype, content, format) => {
    expect(getDetectedFormat(content)).toBe(format);
    expect(validateUploadedFile({ originalname, mimetype }, content).format).toBe(format);
  });

  it('rejects empty and unsupported content', () => {
    expect(() => validateUploadedFile({ originalname: 'empty.png', mimetype: 'image/png' }, Buffer.alloc(0)))
      .toThrow('empty');
    expect(() => validateUploadedFile({ originalname: 'receipt.png', mimetype: 'image/png' }, Buffer.from('not an image')))
      .toThrow('contents');
  });

  it('rejects extension and MIME mismatches', () => {
    expect(() => validateUploadedFile({ originalname: 'receipt.png', mimetype: 'image/png' }, jpeg))
      .toThrow('extension');
    expect(() => validateUploadedFile({ originalname: 'receipt.jpg', mimetype: 'image/png' }, jpeg))
      .toThrow('type');
  });

  it('rejects files larger than the upload limit', () => {
    expect(() => validateUploadedFile(
      { originalname: 'receipt.png', mimetype: 'image/png' },
      Buffer.alloc(MAX_FILE_SIZE + 1)
    )).toThrow('10MB');
  });
});
