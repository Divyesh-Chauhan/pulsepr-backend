import prisma from '../../../lib/prisma.js';
import { authorizeAdmin } from '../../../middlewares/auth.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { offerId, category } = req.body;

        if (!offerId) {
            return res.status(400).json({ message: 'Offer ID is required' });
        }

        const offer = await prisma.offers.findUnique({ where: { id: parseInt(offerId) } });
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        let productsToUpdate;

        if (category) {
            productsToUpdate = await prisma.product.findMany({ where: { category } });
        } else { // Global Update
            productsToUpdate = await prisma.product.findMany({});
        }

        // Apply the discount to discountPrice
        for (const prod of productsToUpdate) {
            const discountMultiplier = (100 - offer.discountPercentage) / 100;
            const newDiscountPrice = prod.price * discountMultiplier;

            await prisma.product.update({
                where: { id: prod.id },
                data: { discountPrice: newDiscountPrice }
            });
        }

        return res.status(200).json({ message: 'Offer successfully applied to products' });

    } catch (error) {
        console.error('Apply Offer Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export default authorizeAdmin(handler);
