import React, { useState } from 'react';

function SettingsPage({ 
  borrowers, 
  transactions, 
  cycleAnchorDate, 
  onImportData 
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportError('');
    setImportSuccess('');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // Basic validation
        if (!data.borrowers || !data.transactions) {
          throw new Error('Invalid data format');
        }
        setPreview({
          borrowers: data.borrowers,
          transactions: data.transactions,
          exportedAt: data.exportedAt,
          cycleAnchorDate: data.cycleAnchorDate || new Date().toISOString()
        });
      } catch (error) {
        setImportError('Invalid file format. Please select a valid export file.');
        setPreview(null);
      }
    };
    reader.onerror = () => {
      setImportError('Error reading file');
      setPreview(null);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file || !preview) return;
    
    setIsImporting(true);
    setImportError('');
    setImportSuccess('');
    
    try {
      // Call the parent component's import handler with the preview data
      await onImportData({
        borrowers: preview.borrowers,
        transactions: preview.transactions,
        cycleAnchorDate: preview.cycleAnchorDate
      });
      setImportSuccess('Data imported successfully!');
      setFile(null);
      setPreview(null);
    } catch (error) {
      console.error('Import error:', error);
      setImportError('Failed to import data. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      cycleAnchorDate: cycleAnchorDate.toISOString(),
      borrowers: [...borrowers],
      transactions: [...transactions]
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportName = `spaylater-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
  };

  return (
    <div className="page settings-page">
      <section className="card">
        <header>
          <h2>Data Management</h2>
          <p className="meta">Backup and transfer your data</p>
        </header>

        <div className="settings-section">
          <h3>Export Data</h3>
          <p>Download a complete backup of your data. This includes all borrowers and transactions.</p>
          
          <div className="stats-grid">
            <div className="stat-card">
              <span className="value">{borrowers.length}</span>
              <span className="label">Borrowers</span>
            </div>
            <div className="stat-card">
              <span className="value">{transactions.length}</span>
              <span className="label">Transactions</span>
            </div>
          </div>
          
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleExport}
          >
            Download Data Export
          </button>
          
          <p className="hint">
            This is a read-only operation. Your current data will not be modified.
          </p>
        </div>
      </section>

      <section className="card" style={{ marginTop: '1.5rem' }}>
        <header>
          <h2>Import Data</h2>
          <p className="meta">Restore from a previous backup</p>
        </header>

        <div className="settings-section">
          <h3>Import Data</h3>
          <p>Upload a previously exported backup file to restore your data.</p>
          
          <div className="file-upload" style={{ margin: '1rem 0' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button 
                type="button"
                className="btn btn-secondary"
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  backgroundColor: isImporting ? '#e9ecef' : '#f8f9fa',
                  color: isImporting ? '#6c757d' : '#212529',
                  pointerEvents: isImporting ? 'none' : 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '120px',
                  marginRight: '0.5rem'
                }}
              >
                {file ? 'Change File' : 'Choose File'}
                <input
                  type="file"
                  id="import-file"
                  accept=".json"
                  onChange={handleFileChange}
                  disabled={isImporting}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                />
              </button>
              {file && (
                <span style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }}>
                  {file.name}
                </span>
              )}
            </div>
          </div>

          {preview && (
            <div className="preview-section" style={{ 
              background: '#f8f9fa', 
              padding: '1rem', 
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <h4>Data Preview</h4>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="value">{preview.borrowers.length}</span>
                  <span className="label">Borrowers</span>
                </div>
                <div className="stat-card">
                  <span className="value">{preview.transactions.length}</span>
                  <span className="label">Transactions</span>
                </div>
                <div className="stat-card">
                  <span className="value">{new Date(preview.exportedAt).toLocaleDateString()}</span>
                  <span className="label">Exported On</span>
                </div>
              </div>
              <p className="hint" style={{ color: '#dc3545', marginTop: '0.5rem' }}>
                ⚠️ This will replace all current data. Make sure to export your current data first if needed.
              </p>
            </div>
          )}

          {importError && (
            <div className="error-message" style={{ color: '#dc3545', margin: '1rem 0' }}>
              {importError}
            </div>
          )}

          {importSuccess && (
            <div className="success-message" style={{ color: '#198754', margin: '1rem 0' }}>
              {importSuccess}
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!file || isImporting}
          >
            {isImporting ? 'Importing...' : 'Import Data'}
          </button>
        </div>
      </section>
    </div>
  );
}


export default SettingsPage;
