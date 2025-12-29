import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default roles
  const roles = [
    { name: "admin", description: "Administrator with full access" },
    { name: "lawyer", description: "Legal professional with standard access" },
    { name: "paralegal", description: "Paralegal with limited access" },
    { name: "client", description: "Client with view-only access" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
    console.log(`  ✓ Role "${role.name}" created/updated`);
  }

  // Create default permissions
  const permissions = [
    { code: "chat:create", name: "Create Chat Sessions", description: "Can create new chat sessions" },
    { code: "chat:read", name: "Read Chat Sessions", description: "Can view chat sessions" },
    { code: "chat:delete", name: "Delete Chat Sessions", description: "Can delete chat sessions" },
    { code: "files:upload", name: "Upload Files", description: "Can upload documents" },
    { code: "files:read", name: "Read Files", description: "Can view documents" },
    { code: "files:delete", name: "Delete Files", description: "Can delete documents" },
    { code: "users:manage", name: "Manage Users", description: "Can manage user accounts" },
    { code: "roles:manage", name: "Manage Roles", description: "Can manage roles and permissions" },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name, description: permission.description },
      create: permission,
    });
    console.log(`  ✓ Permission "${permission.code}" created/updated`);
  }

  // Assign all permissions to admin role
  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  const allPermissions = await prisma.permission.findMany();

  if (adminRole) {
    for (const permission of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      });
    }
    console.log("  ✓ Admin role assigned all permissions");
  }

  // Assign basic permissions to lawyer role
  const lawyerRole = await prisma.role.findUnique({ where: { name: "lawyer" } });
  const lawyerPermissions = ["chat:create", "chat:read", "files:upload", "files:read"];

  if (lawyerRole) {
    for (const code of lawyerPermissions) {
      const permission = await prisma.permission.findUnique({ where: { code } });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: lawyerRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: lawyerRole.id,
            permissionId: permission.id,
          },
        });
      }
    }
    console.log("  ✓ Lawyer role assigned basic permissions");
  }

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
