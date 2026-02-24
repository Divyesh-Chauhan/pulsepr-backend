import prisma from '../../../lib/prisma.js';
import { authorizeAdmin } from '../../../middlewares/auth.js';

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const totalUsers = await prisma.user.count({ where: { role: 'USER' } });

        // Total orders and total revenue
        const orders = await prisma.orders.findMany({
            where: { orderStatus: { in: ['Paid', 'Shipped', 'Delivered'] } }
        });
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

        // Top selling products by sum of quantity
        const orderItems = await prisma.orderItems.groupBy({
            by: ['productId'],
            _sum: {
                quantity: true
            },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            },
            take: 5
        });

        const topProductIds = orderItems.map(item => item.productId);

        // Fetch product details for top selling
        const topProductsData = await prisma.product.findMany({
            where: { id: { in: topProductIds } },
            select: { id: true, name: true, category: true, images: { take: 1 } }
        });

        // Map the aggregated sum to the product data
        const topSellingProducts = orderItems.map(item => {
            const productDetail = topProductsData.find(p => p.id === item.productId);
            return {
                ...productDetail,
                totalSold: item._sum.quantity
            };
        });

        return res.status(200).json({
            stats: {
                totalUsers,
                totalOrders,
                totalRevenue,
                topSellingProducts
            }
        });

    } catch (error) {
        console.error('Admin Stats Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export default authorizeAdmin(handler);
