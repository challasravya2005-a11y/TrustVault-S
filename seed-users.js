require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const seedUsers = [
  { email: 'admin@trustvault.test', name: 'Admin User', role: 'admin', password: 'Admin@12345' },
  { email: 'uploader@trustvault.test', name: 'Uploader User', role: 'uploader', password: 'Uploader@12345' },
  { email: 'viewer@trustvault.test', name: 'Viewer User', role: 'viewer', password: 'Viewer@12345' }
];

async function seed() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
  }

  for (const user of seedUsers) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    const { error } = await supabase.from('users').upsert(
      {
        email: user.email,
        name: user.name,
        role: user.role,
        password_hash: passwordHash
      },
      { onConflict: 'email' }
    );
    if (error) {
      console.error(`Failed to seed ${user.email}:`, error.message);
      process.exitCode = 1;
    } else {
      console.log(`Seeded ${user.role}: ${user.email}`);
    }
  }
}

seed();
