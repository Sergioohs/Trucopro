'use client';
import { useEffect, useState } from 'react';

export default function AdminHiddenPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/admin/hidden/stats`).then((r) => r.json()).then(setData);
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Painel Admin (Oculto)</h1>
      <pre className="mt-4 overflow-auto rounded bg-black/40 p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
