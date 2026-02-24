import prisma from '../lib/prisma.js';
import cloudinary from '../lib/cloudinary.js';
import streamifier from 'streamifier';

// Helper: upload a single buffer to Cloudinary and return { url, publicId }
const uploadBufferToCloudinary = (buffer, folder = 'pulsepr/products') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image' },
            (error, result) => {
                if (error) return reject(error);
                resolve({ url: result.secure_url, publicId: result.public_id });
            }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};

// POST /api/admin/product/upload-image
export const uploadImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const uploadResults = await Promise.all(
            req.files.map(file => uploadBufferToCloudinary(file.buffer, 'pulsepr/products'))
        );

        const images = uploadResults.map(r => r.url);
        return res.status(200).json({ message: 'Files uploaded successfully', images });
    } catch (error) {
        console.error('Upload Error:', error);
        return res.status(500).json({ message: 'Image upload failed' });
    }
};

// POST /api/admin/product/add
export const addProduct = async (req, res) => {
    try {
        const {
            name,
            brand = 'PULSEPR',
            description,
            price,
            discountPrice,
            category,
            isActive = true,
            images = [],
            sizes = []
        } = req.body;

        if (!name || !price || !category) {
            return res.status(400).json({ message: 'Name, price and category are required' });
        }

        const newProduct = await prisma.product.create({
            data: {
                name,
                brand,
                description,
                price: parseFloat(price),
                discountPrice: discountPrice ? parseFloat(discountPrice) : null,
                category,
                isActive: isActive === 'false' ? false : Boolean(isActive),
                images: { create: images.map(url => ({ imageUrl: url })) },
                sizes: {
                    create: sizes.map(sz => ({
                        size: sz.size,
                        stockQuantity: parseInt(sz.stockQuantity) || 0
                    }))
                }
            },
            include: { images: true, sizes: true }
        });

        return res.status(201).json({ message: 'Product created successfully', product: newProduct });
    } catch (error) {
        console.error('Add Product Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// PUT /api/admin/product/update/:id
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, brand, description, price, discountPrice, category, isActive, images, sizes } = req.body;
        const productId = parseInt(id);

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (brand !== undefined) updateData.brand = brand;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (discountPrice !== undefined) updateData.discountPrice = discountPrice ? parseFloat(discountPrice) : null;
        if (category !== undefined) updateData.category = category;
        if (isActive !== undefined) updateData.isActive = isActive === 'false' ? false : Boolean(isActive);

        await prisma.product.update({ where: { id: productId }, data: updateData });

        if (images && images.length > 0) {
            await prisma.productImages.deleteMany({ where: { productId } });
            await prisma.productImages.createMany({
                data: images.map(url => ({ productId, imageUrl: url }))
            });
        }

        if (sizes && sizes.length > 0) {
            await prisma.sizes.deleteMany({ where: { productId } });
            await prisma.sizes.createMany({
                data: sizes.map(sz => ({
                    productId,
                    size: sz.size,
                    stockQuantity: parseInt(sz.stockQuantity) || 0
                }))
            });
        }

        const fullProduct = await prisma.product.findUnique({
            where: { id: productId },
            include: { images: true, sizes: true }
        });
        return res.status(200).json({ message: 'Product updated successfully', product: fullProduct });
    } catch (error) {
        console.error('Update Product Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// DELETE /api/admin/product/delete/:id
export const deleteProduct = async (req, res) => {
    try {
        const productId = parseInt(req.params.id);

        // Delete product images from Cloudinary before removing from DB
        const productImages = await prisma.productImages.findMany({ where: { productId } });
        for (const img of productImages) {
            // Extract publicId from cloudinary URL if stored as URL
            const urlParts = img.imageUrl.split('/');
            const folderAndFile = urlParts.slice(-2).join('/').replace(/\.[^/.]+$/, '');
            try {
                await cloudinary.uploader.destroy(folderAndFile);
            } catch (cErr) {
                console.warn('Cloudinary delete warning:', cErr.message);
            }
        }

        await prisma.product.delete({ where: { id: productId } });
        return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete Product Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/admin/products
export const getProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: { images: true, sizes: true },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ products });
    } catch (error) {
        console.error('Get Products Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/admin/orders
export const getOrders = async (req, res) => {
    try {
        const orders = await prisma.orders.findMany({
            include: {
                user: { select: { id: true, name: true, email: true } },
                orderItems: { include: { product: { select: { name: true, images: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ orders });
    } catch (error) {
        console.error('Get Orders Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// PATCH /api/admin/order/status/:id
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderStatus } = req.body;
        const validStatuses = ['Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(orderStatus)) {
            return res.status(400).json({ message: 'Invalid order status' });
        }

        const updatedOrder = await prisma.orders.update({
            where: { id: parseInt(req.params.id) },
            data: { orderStatus }
        });
        return res.status(200).json({ message: 'Order status updated successfully', order: updatedOrder });
    } catch (error) {
        console.error('Update Order Status Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/admin/users
export const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                _count: { select: { orders: true, designUploads: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ users });
    } catch (error) {
        console.error('Get Users Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/admin/stats
export const getStats = async (req, res) => {
    try {
        const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
        const orders = await prisma.orders.findMany({
            where: { orderStatus: { in: ['Paid', 'Shipped', 'Delivered'] } }
        });
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const pendingDesigns = await prisma.designUpload.count({ where: { status: 'Pending' } });

        const orderItems = await prisma.orderItems.groupBy({
            by: ['productId'],
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });
        const topProductIds = orderItems.map(item => item.productId);
        const topProductsData = await prisma.product.findMany({
            where: { id: { in: topProductIds } },
            select: { id: true, name: true, category: true, images: { take: 1 } }
        });

        const topSellingProducts = orderItems.map(item => {
            const productDetail = topProductsData.find(p => p.id === item.productId);
            return { ...productDetail, totalSold: item._sum.quantity };
        });

        return res.status(200).json({
            stats: { totalUsers, totalOrders, totalRevenue, pendingDesigns, topSellingProducts }
        });
    } catch (error) {
        console.error('Get Stats Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/admin/offers
export const getOffers = async (req, res) => {
    try {
        const offers = await prisma.offers.findMany({ orderBy: { startDate: 'asc' } });
        return res.status(200).json({ offers });
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// POST /api/admin/offers
export const createOffer = async (req, res) => {
    try {
        const { title, discountPercentage, startDate, endDate, isActive = true } = req.body;
        if (!title || !discountPercentage || !startDate || !endDate) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const offer = await prisma.offers.create({
            data: {
                title,
                discountPercentage: parseFloat(discountPercentage),
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
};

// POST /api/admin/offers/apply
export const applyOffer = async (req, res) => {
    try {
        const { offerId, category } = req.body;
        if (!offerId) return res.status(400).json({ message: 'Offer ID is required' });

        const offer = await prisma.offers.findUnique({ where: { id: parseInt(offerId) } });
        if (!offer) return res.status(404).json({ message: 'Offer not found' });

        const productsToUpdate = category
            ? await prisma.product.findMany({ where: { category } })
            : await prisma.product.findMany({});

        for (const prod of productsToUpdate) {
            const discountMultiplier = (100 - offer.discountPercentage) / 100;
            const newDiscountPrice = parseFloat((prod.price * discountMultiplier).toFixed(2));
            await prisma.product.update({ where: { id: prod.id }, data: { discountPrice: newDiscountPrice } });
        }
        return res.status(200).json({ message: 'Offer successfully applied to products' });
    } catch (error) {
        console.error('Apply Offer Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/admin/designs
export const getAllDesigns = async (req, res) => {
    try {
        const designs = await prisma.designUpload.findMany({
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ designs });
    } catch (error) {
        console.error('Get Designs Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// PATCH /api/admin/designs/:id/status
export const updateDesignStatus = async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        const validStatuses = ['Pending', 'Reviewed', 'InProduction', 'Completed', 'Rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid design status' });
        }

        const design = await prisma.designUpload.update({
            where: { id: parseInt(req.params.id) },
            data: { status, adminNote: adminNote || null }
        });
        return res.status(200).json({ message: 'Design status updated', design });
    } catch (error) {
        console.error('Update Design Status Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
