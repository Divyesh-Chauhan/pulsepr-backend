import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// POST /api/auth/register
export const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email, and password' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        // Only allow ADMIN role assignment if explicitly passed — in production you'd restrict this further
        const userRole = role === 'ADMIN' ? 'ADMIN' : 'USER';

        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role: userRole },
        });

        // Auto-create an empty cart for the new user
        await prisma.cart.create({ data: { userId: user.id } });

        return res.status(201).json({
            message: 'User registered successfully',
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Registration Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/auth/profile — Get current user's profile
export const getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true, createdAt: true }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        return res.status(200).json({ user });
    } catch (error) {
        console.error('Get Profile Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// GET /api/auth/orders — Get current user's order history
export const getMyOrders = async (req, res) => {
    try {
        const orders = await prisma.orders.findMany({
            where: { userId: req.user.id },
            include: {
                orderItems: {
                    include: {
                        product: { select: { name: true, images: { take: 1 } } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ orders });
    } catch (error) {
        console.error('Get My Orders Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
