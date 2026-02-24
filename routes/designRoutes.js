import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { uploadDesignImage } from '../middlewares/uploadMiddleware.js';
import {
    uploadDesign,
    getMyDesigns,
    getDesignById,
    deleteDesign
} from '../controllers/designController.js';

const router = express.Router();

// All design routes require authentication
router.use(authenticate);

// POST /api/designs/upload — Upload a custom design
router.post('/upload', uploadDesignImage, uploadDesign);

// GET /api/designs/my-designs — View all your uploaded designs
router.get('/my-designs', getMyDesigns);

// GET /api/designs/:id — View a specific design
router.get('/:id', getDesignById);

// DELETE /api/designs/:id — Delete a pending/rejected design
router.delete('/:id', deleteDesign);

export default router;
