import { getSession, isOwner } from '../_lib/session';
import { redirect } from 'next/navigation';
import AdminPanel from './AdminPanel';
import { createClient } from '../_lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const session = await getSession();
    if (!session) redirect('/login');
    if (!isOwner(session.profile)) redirect('/');

    // Fetch all users (owner can see all via RLS policy)
    const supabase = await createClient();
    const { data: users } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role, can_use_alerts, created_at')
        .order('created_at', { ascending: false });

    return <AdminPanel users={users || []} currentUserId={session.user.id} />;
}
