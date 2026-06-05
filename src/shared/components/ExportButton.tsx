'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  onExport: () => Promise<void> | void;
  disabled?: boolean;
}

export function ExportButton({ onExport, disabled = false }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (isExporting || disabled) return;
    setIsExporting(true);
    try {
      await onExport();
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={disabled || isExporting}
      aria-label="Exportar dados"
    >
      <Download className="size-4" />
      {isExporting ? 'Exportando...' : 'Exportar CSV'}
    </Button>
  );
}
