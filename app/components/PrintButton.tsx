"use client";

export default function PrintButton({ label = "Imprimer" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm"
    >
      {label}
    </button>
  );
}
