import prisma from '../../../lib/prisma.js';
import { authorizeAdmin } from '../../../middlewares/auth.js';

async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const offers = await prisma.offers.findMany({
                orderBy: { startDate: 'asc' }
            });
            return res.status(200).json({ offers });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { title, discountPercentage, startDate, endDate, isActive = true } = req.body;

            if (!title || !discountPercentage || !startDate || !endDate) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            const offer = await prisma.offers.create({
                data: {
                    title,
                    discountPercentage,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    isActive
                }
            });

            return res.status(201).json({ message: 'Offer created successfully', offer });
        } catch (error) {
            console.error('Create Offer Error:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}

export default authorizeAdmin(handler);
