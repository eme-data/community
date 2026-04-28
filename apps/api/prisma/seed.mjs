/**
 * Demo seed — creates a sample tenant, OWNER user, template and posts.
 *
 * Run from inside the running API container:
 *   docker compose exec api npx prisma db seed
 *
 * Idempotent: safe to run multiple times (uses upsert on natural keys).
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@meoxa.app';
const DEMO_PASSWORD = 'demo1234';
const DEMO_TENANT_SLUG = 'demo';

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: DEMO_TENANT_SLUG },
    update: {},
    create: {
      slug: DEMO_TENANT_SLUG,
      name: 'Demo Agency',
      brandName: 'Demo Agency',
      primaryColor: '#6366f1',
      onboardingStep: 'done',
      onboardingCompletedAt: new Date(),
    },
  });

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, emailVerifiedAt: new Date() },
    create: {
      email: DEMO_EMAIL,
      name: 'Demo Owner',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    update: { role: 'OWNER' },
    create: { userId: user.id, tenantId: tenant.id, role: 'OWNER' },
  });

  const existingTemplates = await prisma.postTemplate.count({
    where: { tenantId: tenant.id },
  });
  if (existingTemplates === 0) {
    await prisma.postTemplate.create({
      data: {
        tenantId: tenant.id,
        name: 'Annonce produit',
        content:
          '🚀 Nouveau chez {{brand}} : {{produit}}.\n\n{{benefice}}\n\nDispo dès aujourd\'hui → {{lien}}',
        thread: [],
        createdByUserId: user.id,
      },
    });
  }

  const existingPosts = await prisma.post.count({
    where: { tenantId: tenant.id },
  });
  if (existingPosts === 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    await prisma.post.create({
      data: {
        tenantId: tenant.id,
        authorUserId: user.id,
        content:
          'Bienvenue sur Demo Agency 👋\n\nCe post est un brouillon de démonstration — édite-le ou supprime-le depuis le composer.',
        status: 'DRAFT',
      },
    });

    await prisma.post.create({
      data: {
        tenantId: tenant.id,
        authorUserId: user.id,
        content:
          'Demain à 9h, on partage notre roadmap Q2 ! Réservez la matinée 📅',
        status: 'SCHEDULED',
        scheduledAt: tomorrow,
      },
    });

    await prisma.post.create({
      data: {
        tenantId: tenant.id,
        authorUserId: user.id,
        content:
          '5 conseils pour gérer plusieurs marques sans s\'éparpiller 🧵',
        thread: [
          'Conseil 1 : centralisez vos comptes sociaux dans un seul outil multi-tenant.',
          'Conseil 2 : posez un calendrier éditorial partagé par marque, avec un thème par jour.',
          'Conseil 3 : créez des templates réutilisables pour les annonces récurrentes.',
        ],
        status: 'DRAFT',
      },
    });
  }

  console.log('✅ Seed terminé.');
  console.log(`   Tenant : ${tenant.name} (${tenant.slug})`);
  console.log(`   Login  : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
