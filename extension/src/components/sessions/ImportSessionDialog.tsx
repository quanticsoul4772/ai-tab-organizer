interface ImportSessionDialogProps {
  show: boolean;
  importData: string;
  isImporting: boolean;
  onDataChange: (data: string) => void;
  onImport: () => void;
  onCancel: () => void;
}

export function ImportSessionDialog({
  show,
  importData,
  isImporting,
  onDataChange,
  onImport,
  onCancel,
}: ImportSessionDialogProps) {
  if (!show) return null;

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#1f2937',
        borderBottom: '1px solid #374151',
      }}
    >
      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: '#f3f4f6' }}>
        Import Sessions
      </h3>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
        Paste JSON data from an exported session file:
      </p>
      <textarea
        placeholder="Paste JSON data here..."
        value={importData}
        onChange={(e) => onDataChange(e.target.value)}
        autoFocus
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '8px',
          marginBottom: '12px',
          backgroundColor: '#374151',
          border: '1px solid #4b5563',
          borderRadius: '4px',
          color: '#f3f4f6',
          fontSize: '12px',
          fontFamily: 'monospace',
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '6px 12px',
            backgroundColor: '#374151',
            color: '#f3f4f6',
            border: '1px solid #4b5563',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onImport}
          disabled={isImporting || !importData.trim()}
          style={{
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isImporting || !importData.trim() ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isImporting || !importData.trim() ? 0.5 : 1,
          }}
        >
          {isImporting ? 'Importing...' : 'Import'}
        </button>
      </div>
    </div>
  );
}
