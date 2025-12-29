const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
});

async function testRegistration() {
  const testEmail = `test-${Date.now()}@example.com`;
  console.log("Testing registration with email:", testEmail);

  try {
    // Check if user exists
    console.log("1. Checking for existing user...");
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    console.log("   Existing user:", existingUser);

    // Hash password
    console.log("2. Hashing password...");
    const passwordHash = await bcrypt.hash("testpassword123", 12);
    console.log("   Password hashed successfully");

    // Create user
    console.log("3. Creating user...");
    const user = await prisma.user.create({
      data: {
        name: "Test User",
        email: testEmail,
        passwordHash,
      },
    });
    console.log("   User created:", user.id);

    // Find or create lawyer role
    console.log("4. Finding lawyer role...");
    let lawyerRole = await prisma.role.findUnique({
      where: { name: "lawyer" },
    });
    console.log("   Lawyer role:", lawyerRole);

    if (!lawyerRole) {
      console.log("   Creating lawyer role...");
      lawyerRole = await prisma.role.create({
        data: {
          name: "lawyer",
          description: "Legal professional with standard access",
        },
      });
      console.log("   Lawyer role created:", lawyerRole.id);
    }

    // Assign role
    console.log("5. Assigning role to user...");
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: lawyerRole.id,
      },
    });
    console.log("   Role assigned successfully");

    // Create audit log
    console.log("6. Creating audit log...");
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_REGISTERED",
        entity: "User",
        entityId: user.id,
        metadata: {
          email: user.email,
        },
      },
    });
    console.log("   Audit log created");

    console.log("\n✅ Registration test PASSED!");
    console.log("User ID:", user.id);

    // Cleanup - delete test user
    console.log("\n7. Cleaning up test user...");
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log("   Test user deleted");

  } catch (error) {
    console.error("\n❌ Registration test FAILED!");
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testRegistration();
