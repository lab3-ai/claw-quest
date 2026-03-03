import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://fzuvaymfnwexchocqaos.supabase.co';
// YOU MUST FIND THIS IN SUPABASE DASHBOARD -> Settings -> API -> service_role (secret)
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_6HrvNlA_exSgl_kzzWVETg_j5KCAovu';

const TARGET_EMAIL = 'leedefai@gmail.com';
const NEW_PASSWORD = 'leedefai';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function syncPassword() {
    console.log(`Searching for user with email: ${TARGET_EMAIL}...`);

    // 1. Find user by email
    const { data: { users }, error: fetchError } = await supabase.auth.admin.listUsers();

    if (fetchError) {
        console.error('Error fetching users:', fetchError.message);
        return;
    }

    const user = users.find(u => u.email === TARGET_EMAIL);

    if (!user) {
        console.error('User not found in Supabase Auth.');
        return;
    }

    console.log(`User found (ID: ${user.id}). Updating password...`);

    // 2. Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: NEW_PASSWORD }
    );

    if (updateError) {
        console.error('Error updating password:', updateError.message);
    } else {
        console.log('✅ Password synced successfully! You can now login with: ' + NEW_PASSWORD);
    }
}

syncPassword();
