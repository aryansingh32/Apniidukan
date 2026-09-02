"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductForm from "@/components/ProductForm";

export default function NewProductPage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <Link href="/products" className="text-sm text-slate-500 hover:text-blue-600">
        ← Back to products
      </Link>
      <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">New product</h2>
        <ProductForm onSaved={(id) => router.push(`/products/${id}`)} onCancel={() => router.push("/products")} />
      </div>
    </div>
  );
}
