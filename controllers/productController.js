import prisma from '../lib/prisma.js';

// GET /api/products
export const getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where: { isActive: true },
                include: { images: true, sizes: true },
                skip,
                take: parseInt(limit),
                orderBy: { [sort]: order }
            }),
            prisma.product.count({ where: { isActive: true } })
        ]);

        return res.status(200).json({
            products,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Fetch Products Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/products/:id
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: { images: true, sizes: true },
        });

        if (!product || !product.isActive) {
            return res.status(404).json({ message: 'Product not found' });
        }
        return res.status(200).json({ product });
    } catch (error) {
        console.error('Fetch Product Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/products/search?q=query
export const searchProducts = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ message: 'Search query is required' });

        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                    { category: { contains: q, mode: 'insensitive' } },
                    { brand: { contains: q, mode: 'insensitive' } }
                ]
            },
            include: { images: true, sizes: true },
        });
        return res.status(200).json({ products });
    } catch (error) {
        console.error('Search Products Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/products/category/:category
export const getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        if (!category) return res.status(400).json({ message: 'Category is required' });

        const products = await prisma.product.findMany({
            where: { category: { equals: category, mode: 'insensitive' }, isActive: true },
            include: { images: true, sizes: true },
        });
        return res.status(200).json({ products });
    } catch (error) {
        console.error('Category Products Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
