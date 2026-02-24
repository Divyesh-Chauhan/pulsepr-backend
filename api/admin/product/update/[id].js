import prisma from '../../../../lib/prisma.js';
import { authorizeAdmin } from '../../../../middlewares/auth.js';

async function handler(req, res) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { id } = req.query;
        const {
            name,
            brand,
            description,
            price,
            discountPrice,
            category,
            isActive,
            images, // Replace mapping
            sizes   // Replace mapping
        } = req.body;

        const productId = parseInt(id);

        const updateData = {
            name,
            brand,
            description,
            price,
            discountPrice,
            category,
            isActive
        };

        // Clean undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: updateData
        });

        if (images && images.length > 0) {
            await prisma.productImages.deleteMany({ where: { productId } });
            await prisma.productImages.createMany({
                data: images.map(url => ({ productId, imageUrl: url }))
            });
        }

        if (sizes && sizes.length > 0) {
            // Just update matching sizes or replace all
            await prisma.sizes.deleteMany({ where: { productId } });
            await prisma.sizes.createMany({
                data: sizes.map(sz => ({ productId, size: sz.size, stockQuantity: sz.stockQuantity }))
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
}

export default authorizeAdmin(handler);
