import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { aiReady } from '@/lib/form-import';
import { PageHeader } from '@/components/admin-ui';
import ImportClient from './ImportClient';

// Reading a scan can take up to a minute
export const maxDuration = 60;

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: centres } = await supabase.from('centres').select('id, name').order('sort_order');
  return (
    <div className="space-y-6">
      <Link href="/admin/requests" className="text-sm text-slate-500 hover:text-slate-900">← Supplier requests</Link>
      <PageHeader eyebrow="Supplier requests" title="Import a supplier form (PDF)" />
      <ImportClient centres={centres ?? []} aiReady={aiReady()} />
    </div>
  );
}
