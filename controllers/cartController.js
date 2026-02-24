import prisma from '../lib/prisma.js';

export const getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        let cart = await prisma.cart.findUnique({
            where: { userId },
            include: { items: { include: { product: { include: { images: true } } } } }
        });

        if (!cart) {
            cart = await prisma.cart.create({ data: { userId }, include: { items: true } });
        }
        return res.status(200).json({ cart });
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, size, quantity = 1 } = req.body;
        if (!productId || !size) return res.status(400).json({ message: 'Product ID and size are required' });

        let cart = await prisma.cart.findUnique({ where: { userId } });
        if (!cart) cart = await prisma.cart.create({ data: { userId } });

        const productSize = await prisma.sizes.findFirst({ where: { productId, size } });
        if (!productSize || productSize.stockQuantity < quantity) {
            return res.status(400).json({ message: 'Insufficient stock or invalid size' });
        }

        const existingItem = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId, size } });

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
                data: { cartId: cart.id, productId, size, quantity }
            });
        }
        return res.status(201).json({ message: 'Item added to cart' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const updateCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId, quantity } = req.body;
        if (!itemId || quantity === undefined) return res.status(400).json({ message: 'Item ID and quantity required' });

        const cart = await prisma.cart.findUnique({ where: { userId } });
        const cartItem = await prisma.cartItem.findUnique({ where: { id: itemId } });

        if (!cartItem || cartItem.cartId !== cart.id) return res.status(403).json({ message: 'Invalid cart item' });

        if (quantity <= 0) {
            await prisma.cartItem.delete({ where: { id: itemId } });
        } else {
            await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
        }
        return res.status(200).json({ message: 'Cart item updated' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;

        const cart = await prisma.cart.findUnique({ where: { userId } });
        await prisma.cartItem.deleteMany({ where: { id: parseInt(itemId), cartId: cart.id } });
        return res.status(200).json({ message: 'Item removed from cart' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
