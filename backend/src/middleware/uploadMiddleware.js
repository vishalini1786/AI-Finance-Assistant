const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDirectory = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
	destination: (_req, _file, callback) => callback(null, uploadDirectory),
	filename: (_req, file, callback) => {
		const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
		callback(null, `${Date.now()}-${safeName}`);
	},
});

const uploadReceipt = multer({
	storage,
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (_req, file, callback) => {
		const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
		callback(null, allowed.includes(file.mimetype));
	},
}).single('file');

module.exports = { uploadReceipt };
