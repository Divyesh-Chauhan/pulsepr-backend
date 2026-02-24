import prisma from '../../lib/prisma.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { id } = req.query;

        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: {
                images: true,
                sizes: true,
            },
        });

        if (!product || !product.isActive) {
            return res.status(404).json({ message: 'Product not found' });
        }

        return res.status(200).json({ product });
    } catch (error) {
        console.error('Fetch Product Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
