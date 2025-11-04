// Import your base44 client and Prisma client
import { base44 } from './base44Client.js';
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

async function migrateUsers() {
  console.log('Migrating users...');

  const base44Users = await base44.entities.User.list({}, 1000);

  for (const base44User of base44Users) {
    try {
      await prisma.user.create({
        data: {
          id: base44User._id,
          email: base44User.email,
          name: base44User.name,
          user_type: base44User.user_type,
          role: base44User.role,
          avatar_url: base44User.avatar_url,
          created_at: new Date(base44User._created_at),
          updated_at: new Date(base44User._updated_at),
        },
      });
      console.log(`✅ Migrated user: ${base44User.email}`);
    } catch (error) {
      console.error(`❌ Failed to migrate user ${base44User.email}:`, error);
    }
  }
}

async function migrateEvents() {
  console.log('Migrating events...');

  const base44Events = await base44.entities.Event.list({}, 10000);

  for (const base44Event of base44Events) {
    try {
      await prisma.event.create({
        data: {
          id: base44Event._id,
          host_id: base44Event.host_id,
          title: base44Event.title,
          description: base44Event.description,
          event_date: base44Event.event_date
            ? new Date(base44Event.event_date)
            : null,
          location: base44Event.location,
          budget: base44Event.budget,
          status: base44Event.status,
          created_at: new Date(base44Event._created_at),
          updated_at: new Date(base44Event._updated_at),
        },
      });
      console.log(`✅ Migrated event: ${base44Event.title}`);
    } catch (error) {
      console.error(`❌ Failed to migrate event ${base44Event.title}:`, error);
    }
  }
}

// Similarly, add migrateEvents(), migrateEnablerProfiles(), etc.

async function migrateAll() {
  await migrateUsers();
  await migrateEvents();
  // ... repeat for all entities
  console.log('✅ Migration complete!');
}

migrateAll().catch(console.error);
