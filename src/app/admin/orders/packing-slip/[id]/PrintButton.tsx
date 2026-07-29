'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center justify-center gap-2 h-10 px-6 bg-[#1a4731] hover:bg-[#2d6a4f] text-white rounded-xl text-xs font-bold shadow-lg shadow-forest-900/10 transition-all cursor-pointer"
    >
      <Printer className="h-4 w-4" />
      Print Packing Slip
    </button>
  );
}
