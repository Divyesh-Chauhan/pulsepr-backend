import prisma from '../../../lib/prisma.js';
import { authorizeAdmin } from '../../../middlewares/auth.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const {
            name,
            brand = 'PULSEPR',
            description,
            price,
            discountPrice,
            category,
            isActive = true,
            images = [], // Array of URLs
            sizes = [] // Array of { size: string, stockQuantity: number }
        } = req.body;

        if (!name || !price || !category) {
            return res.status(400).json({ message: 'Name, price and category are required' });
        }

        const newProduct = await prisma.product.create({
            data: {
                name,
                brand,
                description,
                price,
                discountPrice,
                category,
                isActive,
                images: {
                    create: images.map(url => ({ imageUrl: url }))
                },
                sizes: {
                    create: sizes.map(sz => ({ size: sz.size, stockQuantity: sz.stockQuantity }))
                }
            },
            include: {
                images: true,
                sizes: true
            }
        });

        return res.status(201).json({ message: 'Product created successfully', product: newProduct });
    } catch (error) {
        console.error('Create Product Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export default authorizeAdmin(handler);
