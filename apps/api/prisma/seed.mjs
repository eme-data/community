/**
 * Demo seed — creates a sample tenant, OWNER user, template and posts.
 *
 * Run from inside the running API container:
 *   docker compose exec api npx prisma db seed
 *
 * Idempotent: safe to run multiple times.
 *
 * Onboarding state is reset on every run so that logging in as the demo
 * user always lands on the auto-onboarding flow (verify → connect → done).
 * Set DEMO_SKIP_ONBOARDING=1 in the env to keep the existing onboarding
 * state untouched.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@meoxa.app';
const DEMO_PASSWORD = 'demo1234';
const DEMO_TENANT_SLUG = 'demo';
const SKIP_ONBOARDING = process.env.DEMO_SKIP_ONBOARDING === '1';

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // --- Tenant ---------------------------------------------------------
  let tenant = await prisma.tenant.findUnique({
    where: { slug: DEMO_TENANT_SLUG },
  });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        slug: DEMO_TENANT_SLUG,
        name: 'Demo Agency',
        brandName: 'Demo Agency',
        primaryColor: '#6366f1',
        // Leave onboarding incomplete so the demo user goes through the
        // auto-onboarding flow at first login.
        onboardingStep: SKIP_ONBOARDING ? 'done' : null,
        onboardingCompletedAt: SKIP_ONBOARDING ? new Date() : null,
      },
    });
  } else if (!SKIP_ONBOARDING) {
    // Reset onboarding state on existing demo tenant so the auto-onboarding
    // flow is visible again on every reseed.
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        onboardingStep: null,
        onboardingCompletedAt: null,
      },
    });
  }

  // --- User -----------------------------------------------------------
  // Demo user is also marked as platform super-admin so they can access
  // /settings/providers and configure OAuth credentials from the UI.
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: 'Demo Owner',
        passwordHash,
        emailVerifiedAt: new Date(),
        isSuperAdmin: true,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, emailVerifiedAt: new Date(), isSuperAdmin: true },
    });
  }

  // --- Membership (OWNER) --------------------------------------------
  const existingMembership = await prisma.membership.findFirst({
    where: { userId: user.id, tenantId: tenant.id },
  });
  if (!existingMembership) {
    await prisma.membership.create({
      data: { userId: user.id, tenantId: tenant.id, role: 'OWNER' },
    });
  } else if (existingMembership.role !== 'OWNER') {
    await prisma.membership.update({
      where: { id: existingMembership.id },
      data: { role: 'OWNER' },
    });
  }

  // --- Templates ------------------------------------------------------
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

  // --- Posts ----------------------------------------------------------
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
  console.log(`   Tenant   : ${tenant.name} (${tenant.slug})`);
  console.log(`   Login    : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`   Onboarding: ${tenant.onboardingCompletedAt ? 'done (skipped)' : 'pending — visible at next login'}`);
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