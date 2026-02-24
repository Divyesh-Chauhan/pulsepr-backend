import Razorpay from 'razorpay';
import prisma from '../../lib/prisma.js';
import { authenticate } from '../../middlewares/auth.js';

const razorpayOptions = {
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
};

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { items, address } = req.body;
        const userId = req.user.id;

        if (!items || !items.length || !address) {
            return res.status(400).json({ message: 'Invalid data' });
        }

        let totalAmount = 0;

        // Calculate total amount from DB to prevent tampering
        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: item.productId } });
            if (!product) return res.status(404).json({ message: `Product ${item.productId} not found` });

            const price = product.discountPrice || product.price;
            totalAmount += price * item.quantity;
        }

        const instance = new Razorpay(razorpayOptions);
        const options = {
            amount: totalAmount * 100, // Razorpay uses paise
            currency: 'INR',
            receipt: `receipt_order_${userId}_${Date.now()}`
        };

        const razorpayOrder = await instance.orders.create(options);

        return res.status(200).json({
            success: true,
            order: razorpayOrder,
            items,
            address,
            totalAmount
        });

    } catch (error) {
        console.error('Create Payment Order Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export default authenticate(handler);
