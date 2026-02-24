import prisma from '../../lib/prisma.js';
import { authenticate } from '../../middlewares/auth.js';

async function handler(req, res) {
    const userId = req.user.id;

    try {
        let cart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            include: { images: true }
                        }
                    }
                }
            }
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId },
                include: { items: true }
            });
        }

        if (req.method === 'GET') {
            return res.status(200).json({ cart });
        }

        if (req.method === 'POST') {
            const { productId, size, quantity = 1 } = req.body;

            if (!productId || !size) {
                return res.status(400).json({ message: 'Product ID and size are required' });
            }

            const productSize = await prisma.sizes.findFirst({
                where: { productId, size }
            });

            if (!productSize || productSize.stockQuantity < quantity) {
                return res.status(400).json({ message: 'Insufficient stock or invalid size' });
            }

            // Check if item exists in cart
            const existingItem = await prisma.cartItem.findFirst({
                where: { cartId: cart.id, productId, size }
            });

            if (existingItem) {
                if (existingItem.quantity + quantity > productSize.stockQuantity) {
                    return res.status(400).json({ message: 'Cannot add more than available stock' });
                }
                await prisma.cartItem.update({
                    where: { id: existingItem.id },
                    data: { quantity: existingItem.quantity + quantity }
                });
            } else {
                await prisma.cartItem.create({
                    data: {
                        cartId: cart.id,
                        productId,
                        size,
                        quantity
                    }
                });
            }
            return res.status(201).json({ message: 'Item added to cart' });
        }

        if (req.method === 'PUT') {
            const { itemId, quantity } = req.body;
            if (!itemId || quantity === undefined) return res.status(400).json({ message: 'Item ID and quantity required' });

            const cartItem = await prisma.cartItem.findUnique({ where: { id: itemId } });
            if (!cartItem || cartItem.cartId !== cart.id) return res.status(403).json({ message: 'Invalid cart item' });

            if (quantity <= 0) {
                await prisma.cartItem.delete({ where: { id: itemId } });
            } else {
                // Validation size/stock could be added here
                await prisma.cartItem.update({
                    where: { id: itemId },
                    data: { quantity }
                });
            }
            return res.status(200).json({ message: 'Cart item updated' });
        }

        if (req.method === 'DELETE') {
            const { itemId } = req.body;
            if (!itemId) return res.status(400).json({ message: 'Item ID required' });

            await prisma.cartItem.deleteMany({
                where: { id: itemId, cartId: cart.id }
            });
            return res.status(200).json({ message: 'Item removed from cart' });
        }

        return res.status(405).json({ message: 'Method Not Allowed' });

    } catch (error) {
        console.error('Cart Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export default authenticate(handler);
