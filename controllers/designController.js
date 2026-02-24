import prisma from '../lib/prisma.js';
import cloudinary from '../lib/cloudinary.js';
import streamifier from 'streamifier';

// Helper: upload buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, folder = 'pulsepr/designs') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image' },
            (error, result) => {
                if (error) return reject(error);
                resolve({ url: result.secure_url, publicId: result.public_id });
            }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};

// POST /api/designs/upload
// User uploads their custom design image
export const uploadDesign = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No design image uploaded. Please attach a file with field name "design".' });
        }

        const { note, printSize, quantity = 1 } = req.body;
        const userId = req.user.id;

        // Upload to Cloudinary
        const { url, publicId } = await uploadBufferToCloudinary(req.file.buffer, 'pulsepr/designs');

        const design = await prisma.designUpload.create({
            data: {
                userId,
                imageUrl: url,
                publicId,
                note: note || null,
                printSize: printSize || null,
                quantity: parseInt(quantity) || 1,
                status: 'Pending'
            }
        });

        return res.status(201).json({
            message: 'Design uploaded successfully! Our team will review it shortly.',
            design
        });
    } catch (error) {
        console.error('Design Upload Error:', error);
        return res.status(500).json({ message: 'Failed to upload design. Please try again.' });
    }
};

// GET /api/designs/my-designs
// User views their own uploaded designs and their statuses
export const getMyDesigns = async (req, res) => {
    try {
        const userId = req.user.id;
        const designs = await prisma.designUpload.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ designs });
    } catch (error) {
        console.error('Get My Designs Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/designs/:id
// Get a specific design (must belong to current user)
export const getDesignById = async (req, res) => {
    try {
        const userId = req.user.id;
        const designId = parseInt(req.params.id);

        const design = await prisma.designUpload.findFirst({
            where: { id: designId, userId }
        });

        if (!design) {
            return res.status(404).json({ message: 'Design not found' });
        }
        return res.status(200).json({ design });
    } catch (error) {
        console.error('Get Design Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// DELETE /api/designs/:id
// User deletes their own design (also removes from Cloudinary)
export const deleteDesign = async (req, res) => {
    try {
        const userId = req.user.id;
        const designId = parseInt(req.params.id);

        const design = await prisma.designUpload.findFirst({
            where: { id: designId, userId }
        });

        if (!design) {
            return res.status(404).json({ message: 'Design not found' });
        }

        // Only allow deletion if still Pending or Rejected
        if (!['Pending', 'Rejected'].includes(design.status)) {
            return res.status(400).json({
                message: 'Cannot delete a design that is currently in review or production. Contact support.'
            });
        }

        // Remove from Cloudinary
        try {
            await cloudinary.uploader.destroy(design.publicId);
        } catch (cErr) {
            console.warn('Cloudinary delete warning:', cErr.message);
        }

        await prisma.designUpload.delete({ where: { id: designId } });
        return res.status(200).json({ message: 'Design deleted successfully' });
    } catch (error) {
        console.error('Delete Design Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
