import prisma from '../../../lib/prisma.js';
import { authorizeAdmin } from '../../../middlewares/auth.js';

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const orders = await prisma.orders.findMany({
            include: {
                user: { select: { id: true, name: true, email: true } },
                orderItems: {
                    include: { product: { select: { name: true, images: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({ orders });
    } catch (error) {
        console.error('Fetch Orders Admin Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export default authorizeAdmin(handler);
