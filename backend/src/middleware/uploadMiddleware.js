const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIME_TYPES = {
	'image/jpeg': 'jpeg',
	'image/jpg': 'jpeg',
	'image/pjpeg': 'jpeg',
	'image/jfif': 'jpeg',
	'image/pjp': 'jpeg',
	'image/png': 'png',
	'image/x-png': 'png',
	'image/apng': 'png',
	'application/pdf': 'pdf',
	'application/x-pdf': 'pdf',
	'application/acrobat': 'pdf',
};
const EXTENSIONS = {
	'.jpg': 'jpeg',
	'.jpeg': 'jpeg',
	'.jfif': 'jpeg',
	'.pjpeg': 'jpeg',
	'.pjp': 'jpeg',
	'.png': 'png',
	'.pdf': 'pdf',
};
const GENERIC_MIME_TYPES = new Set(['', 'application/octet-stream', 'binary/octet-stream', 'image/*']);

function getDetectedFormat(content) {
	if (!content || !Buffer.isBuffer(content)) return null;
	if (content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
		return 'png';
	}
	if (content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) {
		return 'jpeg';
	}
	if (content.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
		return 'pdf';
	}
	return null;
}

function validateUploadedFile(file, content) {
	if (!content || content.length === 0) {
		throw uploadError('The selected file is empty.');
	}
	if (content.length > MAX_FILE_SIZE) {
		const err = uploadError('File size exceeds 10MB limit. Please upload a smaller document.');
		err.statusCode = 413;
		throw err;
	}

	const extension = path.extname(file.originalname || '').toLowerCase().trim();
	const extensionFormat = EXTENSIONS[extension];
	const declaredMime = String(file.mimetype || '').split(';')[0].trim().toLowerCase();
	const declaredFormat = MIME_TYPES[declaredMime];
	const detectedFormat = getDetectedFormat(content);

	if (!detectedFormat) {
		throw uploadError('The file contents are not a supported PNG, JPG/JPEG, or PDF document.');
	}
	if (extension && extensionFormat && extensionFormat !== detectedFormat) {
		throw uploadError('The file extension does not match its contents. Upload a PNG, JPG/JPEG, or PDF document.');
	}
	if (declaredFormat && declaredFormat !== detectedFormat) {
		throw uploadError('The file type does not match its contents. Upload a PNG, JPG/JPEG, or PDF document.');
	}
	if (!declaredFormat && !GENERIC_MIME_TYPES.has(declaredMime) && !extensionFormat) {
		throw uploadError('Unsupported file format or type. Upload a PNG, JPG/JPEG, or PDF document.');
	}

	return {
		format: detectedFormat,
		mimetype: detectedFormat === 'pdf' ? 'application/pdf' : (detectedFormat === 'jpeg' ? 'image/jpeg' : 'image/png'),
	};
}

function uploadError(message) {
	const error = new Error(message);
	error.statusCode = 400;
	error.expose = true;
	return error;
}

const uploadDirectory = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
	destination: (_req, _file, callback) => callback(null, uploadDirectory),
	filename: (_req, file, callback) => {
		const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
		callback(null, `${Date.now()}-${safeName}`);
	},
});

const multerInstance = multer({
	storage,
	limits: { fileSize: MAX_FILE_SIZE },
	fileFilter: (_req, file, callback) => {
		const extension = path.extname(file.originalname || '').toLowerCase().trim();
		const declaredMime = String(file.mimetype || '').split(';')[0].trim().toLowerCase();
		if (EXTENSIONS[extension] || MIME_TYPES[declaredMime] || GENERIC_MIME_TYPES.has(declaredMime) || !extension) {
			callback(null, true);
		} else {
			callback(uploadError('Unsupported file format or type. Upload a PNG, JPG/JPEG, or PDF document.'));
		}
	},
});

const uploadFields = multerInstance.fields([
	{ name: 'file', maxCount: 1 },
	{ name: 'receipt', maxCount: 1 },
]);

function uploadReceipt(req, res, next) {
	uploadFields(req, res, (err) => {
		if (err) {
			if (err.code === 'LIMIT_FILE_SIZE') {
				return res.status(400).json({
					success: false,
					message: 'File size exceeds 10MB limit. Please upload a smaller document.',
					error: 'LIMIT_FILE_SIZE',
				});
			}
			return res.status(err.statusCode || 400).json({
				success: false,
				message: err.message || 'File upload failed',
				error: 'UPLOAD_ERROR',
			});
		}
		if (req.files) {
			req.file = req.files['file']?.[0] || req.files['receipt']?.[0];
		}
		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: 'Receipt or document file is required (JPG, PNG, or PDF).',
				error: 'FILE_REQUIRED',
			});
		}

		fs.promises.readFile(req.file.path)
			.then((content) => {
				const validated = validateUploadedFile(req.file, content);
				req.file.mimetype = validated.mimetype;
				next();
			})
			.catch(async (validationError) => {
				try {
					await fs.promises.unlink(req.file.path);
				} catch (cleanupError) {
					if (cleanupError.code !== 'ENOENT') {
						console.error('[OCR] Failed to remove rejected upload:', cleanupError.code || cleanupError.name);
					}
				}
				return res.status(validationError.statusCode || (validationError.expose ? 400 : 500)).json({
					success: false,
					message: validationError.expose
						? validationError.message
						: 'The uploaded document could not be validated.',
					error: validationError.expose ? 'INVALID_DOCUMENT' : 'UPLOAD_VALIDATION_FAILED',
				});
			});
	});
}

module.exports = { uploadReceipt, validateUploadedFile, getDetectedFormat, MAX_FILE_SIZE };
