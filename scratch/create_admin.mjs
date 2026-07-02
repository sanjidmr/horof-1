import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.substring(1, value.length - 1);
    }
    if (value.length > 0 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const email = 'testadmin@horof.art';
  const password = 'Admin123456!';

  console.log(`Checking if user ${email} exists...`);
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list users:", listError);
    return;
  }

  let user = users.users.find(u => u.email === email);

  if (!user) {
    console.log(`Creating user ${email}...`);
    const { data: res, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createError) {
      console.error("Failed to create user:", createError);
      return;
    }
    user = res.user;
    console.log("User created successfully!");
  } else {
    console.log(`User ${email} already exists. Updating password...`);
    const { data: res, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password
    });
    if (updateError) {
      console.error("Failed to update password:", updateError);
      return;
    }
    user = res.user;
    console.log("Password updated successfully!");
  }

  console.log(`Ensuring profile role is 'admin' for user ID: ${user.id}...`);
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email,
      role: 'admin'
    })
    .select();

  if (profileError) {
    console.error("Failed to update profile:", profileError);
  } else {
    console.log("Profile updated successfully:", profile);
  }
}

run();
