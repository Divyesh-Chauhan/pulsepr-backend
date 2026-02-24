import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertAdmin() {
    const name = 'Admin';
    const email = 'admin@pulsepr.com';
    const password = 'Admin@2025';

    try {
        const hashedPassword = await bcrypt.hash(password, 12);

        const existing = await prisma.user.findUnique({ where: { email } });

        if (existing) {
            // Update role to ADMIN and reset password
            const updated = await prisma.user.update({
                where: { email },
                data: {
                    name,
                    password: hashedPassword,
                    role: 'ADMIN',
                },
            });
            console.log('\n✅ Existing user updated to ADMIN!');
            console.log('   ─────────────────────────────');
            console.log(`   ID    : ${updated.id}`);
            console.log(`   Name  : ${updated.name}`);
            console.log(`   Email : ${updated.email}`);
            console.log(`   Role  : ${updated.role}`);
            console.log('   Password: Admin@2024\n');
        } else {
            const admin = await prisma.user.create({
                data: { name, email, password: hashedPassword, role: 'ADMIN' },
            });
            await prisma.cart.create({ data: { userId: admin.id } });

            console.log('\n✅ Admin user created successfully!');
            console.log('   ─────────────────────────────');
            console.log(`   ID    : ${admin.id}`);
            console.log(`   Name  : ${admin.name}`);
            console.log(`   Email : ${admin.email}`);
            console.log(`   Role  : ${admin.role}`);
            console.log('   Password: Admin@2024\n');
        }
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

upsertAdmin();
