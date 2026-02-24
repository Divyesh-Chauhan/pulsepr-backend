import express from 'express';
import { register, login, getProfile, getMyOrders } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.get('/orders', authenticate, getMyOrders);

export default router;
