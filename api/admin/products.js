import prisma from '../../../lib/prisma.js';
import { authorizeAdmin } from '../../../middlewares/auth.js';

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const products = await prisma.product.findMany({
            include: {
                images: true,
                sizes: true,
            },
        });

        return res.status(200).json({ products });
    } catch (error) {
        console.error('Admin Products Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export default authorizeAdmin(handler);
