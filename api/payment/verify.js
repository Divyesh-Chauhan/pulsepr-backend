import prisma from '../../lib/prisma.js';
import { authenticate } from '../../middlewares/auth.js';
import crypto from 'crypto';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            items,
            address,
            totalAmount
        } = req.body;
        const userId = req.user.id;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !items || !address) {
            return res.status(400).json({ message: 'Invalid payment details' });
        }

        // Verify signature
        const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', secret).update(body.toString()).digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Invalid signature' });
        }

        // Transaction to create order and reduce stock safely
        const orderData = await prisma.$transaction(async (tx) => {
            // 1. Check stock and reduce it
            for (const item of items) {
                const productSize = await tx.sizes.findFirst({
                    where: { productId: item.productId, size: item.size }
                });

                if (!productSize || productSize.stockQuantity < item.quantity) {
                    throw new Error(`Insufficient stock for product ${item.productId} size ${item.size}`);
                }

                await tx.sizes.update({
                    where: { id: productSize.id },
                    data: { stockQuantity: productSize.stockQuantity - item.quantity }
                });
            }

            // 2. Create the Order
            const newOrder = await tx.orders.create({
                data: {
                    userId,
                    totalAmount,
                    paymentId: razorpay_payment_id,
                    orderStatus: 'Paid',
                    address,
                }
            });

            // 3. Create OrderItems
            for (const item of items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                const price = product.discountPrice || product.price;

                await tx.orderItems.create({
                    data: {
                        orderId: newOrder.id,
                        productId: item.productId,
                        size: item.size,
                        quantity: item.quantity,
                        price: price
                    }
                });
            }

            // 4. Clear cart for user
            const cart = await tx.cart.findUnique({ where: { userId } });
            if (cart) {
                await tx.cartItem.deleteMany({
                    where: { cartId: cart.id }
                });
            }

            return newOrder;
        });

        return res.status(200).json({ success: true, message: 'Payment verified and order created', order: orderData });

    } catch (error) {
        console.error('Verify Payment Error:', error);
        if (error.message.includes('Insufficient stock')) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export default authenticate(handler);
