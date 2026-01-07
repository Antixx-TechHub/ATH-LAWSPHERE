const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeAdmin() {
  try {
    // Create admin role
    const role = await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', description: 'Administrator with full access' }
    });
    console.log('✅ Admin role:', role);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: 'prashant@antixxtechhub.com' }
    });
    
    if (!user) {
      console.log('❌ User not found with email: prashant@antixxtechhub.com');
      return;
    }
    console.log('✅ User found:', user.id, user.email);

    // Assign role
    const userRole = await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id }
    });
    console.log('✅ Admin role assigned:', userRole);
    console.log('\n🎉 User prashant@antixxtechhub.com is now an admin!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
