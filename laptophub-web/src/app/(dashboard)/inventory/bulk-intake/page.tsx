'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/shared/PageHeader';
import { FileImportWizardV2 } from '@/components/inventory/FileImportWizardV2';
import { UploadedFilesTab } from '@/components/inventory/UploadedFilesTab';

export default function BulkIntakePage() {
  const [tab, setTab] = useState<'import' | 'files'>('import');

  return (
    <div>
      <PageHeader
        title="Bulk Intake"
        description="CSV se ek saath bahut saari stock add karein."
      />

      <div className="mb-6 flex gap-2 border-b">
        <button
          onClick={() => setTab('import')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'import'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground'
          }`}
        >
          File Import
        </button>
        <button
          onClick={() => setTab('files')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'files'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground'
          }`}
        >
          Uploaded Files
        </button>
      </div>

      {tab === 'import' ? <FileImportWizardV2 /> : <UploadedFilesTab />}
    </div>
  );
}