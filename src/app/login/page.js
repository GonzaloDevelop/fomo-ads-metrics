import { getSession } from '../_lib/session';
import { redirect } from 'next/navigation';
import AuthForm from './AuthForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
    // Only redirect if user is fully authenticated AND has a profile
    const session = await getSession();
    if (session?.profile) redirect('/');

    return <AuthForm />;
}
