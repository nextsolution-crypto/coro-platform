"use client";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
export default function ProductCatalogPage() {
  const router = useRouter();
  return (
    <AppLayout>
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-3xl font-semibold text-slate-800">
          Product Catalog
        </h1>
        <p className="mt-2 text-slate-500">
          Catalogue commercial administratif. Il ne représente aucun
          entitlement.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            [
              "Capabilities",
              "Taxonomie, disponibilité et scopes.",
              "/admin/product-catalog/capabilities",
            ],
            [
              "Price Books",
              "Catalogues versionnés, composants et tiers.",
              "/admin/product-catalog/price-books",
            ],
          ].map(([title, text, path]) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              className="rounded-xl border bg-white p-6 text-left shadow-sm"
            >
              <strong className="text-xl">{title}</strong>
              <p className="mt-2 text-sm text-slate-500">{text}</p>
            </button>
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
