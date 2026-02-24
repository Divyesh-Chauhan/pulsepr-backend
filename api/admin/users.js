import prisma from '../../../lib/prisma.js';
import { authorizeAdmin } from '../../../middlewares/auth.js';

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                _count: {
                    select: { orders: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({ users });
    } catch (error) {
        console.error('Fetch Users Admin Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export default authorizeAdmin(handler);
