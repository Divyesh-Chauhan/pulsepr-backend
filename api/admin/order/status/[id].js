import prisma from '../../../../lib/prisma.js';
import { authorizeAdmin } from '../../../../middlewares/auth.js';

async function handler(req, res) {
    if (req.method !== 'PATCH') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { id } = req.query;
        const { orderStatus } = req.body;

        const validStatuses = ['Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled'];

        if (!validStatuses.includes(orderStatus)) {
            return res.status(400).json({ message: 'Invalid order status' });
        }

        const updatedOrder = await prisma.orders.update({
            where: { id: parseInt(id) },
            data: { orderStatus }
        });

        return res.status(200).json({ message: 'Order status updated successfully', order: updatedOrder });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Order not found' });
        }
        console.error('Update Order Status Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export default authorizeAdmin(handler);
