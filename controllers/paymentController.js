import Razorpay from 'razorpay';
import prisma from '../lib/prisma.js';
import crypto from 'crypto';

const razorpayOptions = {
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
};

export const createOrder = async (req, res) => {
    try {
        const { items, address } = req.body;
        const userId = req.user.id;

        if (!items || !items.length || !address) return res.status(400).json({ message: 'Invalid data' });

        let totalAmount = 0;
        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: item.productId } });
            if (!product) return res.status(404).json({ message: `Product ${item.productId} not found` });
            const price = product.discountPrice || product.price;
            totalAmount += price * item.quantity;
        }

        const instance = new Razorpay(razorpayOptions);
        const options = {
            amount: totalAmount * 100,
            currency: 'INR',
            receipt: `receipt_order_${userId}_${Date.now()}`
        };

        const razorpayOrder = await instance.orders.create(options);
        return res.status(200).json({ success: true, order: razorpayOrder, items, address, totalAmount });
    } catch (error) {
        console.error('Create Payment Order Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, address, totalAmount } = req.body;
        const userId = req.user.id;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !items || !address) {
            return res.status(400).json({ message: 'Invalid payment details' });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', secret).update(body.toString()).digest('hex');

        if (expectedSignature !== razorpay_signature) return res.status(400).json({ message: 'Invalid signature' });

        const orderData = await prisma.$transaction(async (tx) => {
            for (const item of items) {
                const productSize = await tx.sizes.findFirst({ where: { productId: item.productId, size: item.size } });
                if (!productSize || productSize.stockQuantity < item.quantity) {
                    throw new Error(`Insufficient stock for product ${item.productId} size ${item.size}`);
                }
                await tx.sizes.update({
                    where: { id: productSize.id },
                    data: { stockQuantity: productSize.stockQuantity - item.quantity }
                });
            }

            const newOrder = await tx.orders.create({
                data: { userId, totalAmount, paymentId: razorpay_payment_id, orderStatus: 'Paid', address }
            });

            for (const item of items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                const price = product.discountPrice || product.price;
                await tx.orderItems.create({
                    data: { orderId: newOrder.id, productId: item.productId, size: item.size, quantity: item.quantity, price: price }
                });
            }

            const cart = await tx.cart.findUnique({ where: { userId } });
            if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

            return newOrder;
        });

        return res.status(200).json({ success: true, message: 'Payment verified and order created', order: orderData });
    } catch (error) {
        if (error.message && error.message.includes('Insufficient stock')) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
