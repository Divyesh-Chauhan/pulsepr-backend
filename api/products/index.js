import prisma from '../../lib/prisma.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const products = await prisma.product.findMany({
            where: {
                isActive: true,
            },
            include: {
                images: true,
                sizes: true,
            },
        });

        return res.status(200).json({ products });
    } catch (error) {
        console.error('Fetch Products Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
