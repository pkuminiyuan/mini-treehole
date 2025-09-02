// @/app/general/page.tsx
'use client';

const fetcher = (url: string) => fetch(url).then((res) => res.json());


export default function GeneralPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-foreground mb-6">
        核心功能
      </h1>
    </section>
  );
}
