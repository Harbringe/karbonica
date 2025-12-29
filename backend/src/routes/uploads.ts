import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/authenticate';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const imagesDir = path.join(uploadsDir, 'images');
const documentsDir = path.join(uploadsDir, 'documents');

[uploadsDir, imagesDir, documentsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for image uploads
const imageStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, imagesDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}${ext}`;
        cb(null, filename);
    },
});

// Configure multer for document uploads
const documentStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, documentsDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}${ext}`;
        cb(null, filename);
    },
});

// File filters
const imageFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
};

const documentFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, Word, Excel, and image files are allowed.'));
    }
};

const uploadImage = multer({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

const uploadDocument = multer({
    storage: documentStorage,
    fileFilter: documentFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

/**
 * @openapi
 * /api/v1/uploads/image:
 *   post:
 *     summary: Upload an image (thumbnail)
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 */
router.post('/image', authenticate, uploadImage.single('image'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({
                status: 'error',
                error: { code: 'NO_FILE', message: 'No image file provided' },
            });
            return;
        }

        const baseUrl = process.env.BASE_URL || `http://localhost:${config.port}`;
        const imageUrl = `${baseUrl}/uploads/images/${req.file.filename}`;

        logger.info('Image uploaded successfully', { filename: req.file.filename, userId: req.user?.id });

        res.json({
            status: 'success',
            data: {
                url: imageUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @openapi
 * /api/v1/uploads/document:
 *   post:
 *     summary: Upload a document
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 */
router.post('/document', authenticate, uploadDocument.single('document'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({
                status: 'error',
                error: { code: 'NO_FILE', message: 'No document file provided' },
            });
            return;
        }

        const baseUrl = process.env.BASE_URL || `http://localhost:${config.port}`;
        const documentUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;
        const ext = path.extname(req.file.originalname).slice(1).toLowerCase();

        logger.info('Document uploaded successfully', { filename: req.file.filename, userId: req.user?.id });

        res.json({
            status: 'success',
            data: {
                id: uuidv4(),
                url: documentUrl,
                name: req.file.originalname,
                filename: req.file.filename,
                type: ext,
                size: req.file.size,
                mimetype: req.file.mimetype,
                uploadedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @openapi
 * /api/v1/uploads/documents:
 *   post:
 *     summary: Upload multiple documents
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Documents uploaded successfully
 */
router.post('/documents', authenticate, uploadDocument.array('documents', 10), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            res.status(400).json({
                status: 'error',
                error: { code: 'NO_FILES', message: 'No document files provided' },
            });
            return;
        }

        const baseUrl = process.env.BASE_URL || `http://localhost:${config.port}`;
        const uploadedDocuments = files.map(file => {
            const ext = path.extname(file.originalname).slice(1).toLowerCase();
            return {
                id: uuidv4(),
                url: `${baseUrl}/uploads/documents/${file.filename}`,
                name: file.originalname,
                filename: file.filename,
                type: ext,
                size: file.size,
                mimetype: file.mimetype,
                uploadedAt: new Date().toISOString(),
            };
        });

        logger.info('Multiple documents uploaded', { count: files.length, userId: req.user?.id });

        res.json({
            status: 'success',
            data: {
                documents: uploadedDocuments,
                count: uploadedDocuments.length,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
