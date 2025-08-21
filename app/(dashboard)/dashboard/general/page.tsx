'use client';

import { useActionState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from '@/lib/db/schema';
import useSWR from 'swr';


const fetcher = (url: string) => fetch(url).then((res) => res.json());



export default function GeneralPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        核心功能
      </h1>
    </section>
  );
}
