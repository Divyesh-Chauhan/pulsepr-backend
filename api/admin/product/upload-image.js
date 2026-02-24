import { runMiddleware } from '../../../middlewares/uploadMiddleware.js';
import { authorizeAdmin } from '../../../middlewares/auth.js';

export const config = {
    api: {
        bodyParser: false, // Disallow Next.js/Vercel body parsing to allow multer to handle the multipart form
    },
};

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await runMiddleware(req, res);

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
        return res.status(200).json({
            message: 'Files uploaded successfully',
            images: imageUrls
        });

    } catch (error) {
        console.error('File Upload Error:', error);
        return res.status(500).json({ message: 'Error uploading files' });
    }
}

export default authorizeAdmin(handler);
