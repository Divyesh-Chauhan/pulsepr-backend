import prisma from '../../../../lib/prisma.js';
import { authorizeAdmin } from '../../../../middlewares/auth.js';

async function handler(req, res) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { id } = req.query;

        await prisma.product.delete({
            where: { id: parseInt(id) }
        });

        return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Product not found' });
        }
        console.error('Delete Product Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export default authorizeAdmin(handler);
