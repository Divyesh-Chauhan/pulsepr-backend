import prisma from '../../../lib/prisma.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { category } = req.query;

        if (!category) {
            return res.status(400).json({ message: 'Category is required' });
        }

        const products = await prisma.product.findMany({
            where: {
                category,
                isActive: true,
            },
            include: {
                images: true,
                sizes: true,
            },
        });

        return res.status(200).json({ products });
    } catch (error) {
        console.error('Category Products Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
