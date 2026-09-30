import React, { useState } from 'react';
import { StoredState, STORAGE_KEY } from '../types/stock';
import {
  exportStateJson,
  importStateJson,
  loadSampleState,
  resetToEmptyDefault,
} from '../services/storage';
import { X, Download, Upload, RefreshCw, AlertTriangle, Check, Database } from 'lucide-react';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  state: StoredState;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  state,
}) => {
  const [importJsonText, setImportJsonText] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    const jsonStr = exportStateJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-view-garment-erp-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatusMessage({
      type: 'success',
      text: 'Backup JSON downloaded successfully!',
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importStateJson(content);
        if (result.success) {
          setStatusMessage({ type: 'success', text: result.message });
          onRefresh();
        } else {
          setStatusMessage({ type: 'error', text: result.message });
        }
      }
    };
    reader.readAsText(file);
  };

  const handleImportText = () => {
    if (!importJsonText.trim()) return;
    const result = importStateJson(importJsonText);
    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message });
      setImportJsonText('');
      onRefresh();
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  const handleLoadSamples = () => {
    if (
      confirm(
        'This will populate your ERP with sample garment lots (Master Saleem, Master Rafiq, DN-101, DN-102, etc.). Proceed?'
      )
    ) {
      loadSampleState();
      setStatusMessage({ type: 'success', text: 'Sample garment dataset loaded successfully.' });
      onRefresh();
    }
  };

  const handleResetClean = () => {
    if (
      confirm(
        'Are you sure you want to reset to initial clean state? All custom designs and stock balances will be cleared.'
      )
    ) {
      resetToEmptyDefault();
      setStatusMessage({ type: 'success', text: 'Reset to initial default state.' });
      onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-neutral-900 text-white flex items-center justify-center">
              <Database className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Database & Backup Manager</h3>
              <p className="text-xs text-neutral-500 font-mono">
                Storage Key: {STORAGE_KEY}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {statusMessage && (
            <div
              className={`p-3 rounded-lg border font-medium flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Current State Summary */}
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-800 mb-2">Active Storage Snapshot:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-neutral-600 font-mono">
              <div>
                <span className="text-[10px] text-neutral-400 block font-sans">Designs:</span>
                <span className="font-bold text-neutral-900">{state.designs.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block font-sans">Masters:</span>
                <span className="font-bold text-neutral-900">{state.masters.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block font-sans">Sizes:</span>
                <span className="font-bold text-neutral-900">{state.sizes.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block font-sans">Stock Rows:</span>
                <span className="font-bold text-neutral-900">{state.stock_balances.length}</span>
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div className="border border-neutral-200 rounded-lg p-3.5 space-y-2">
            <div className="font-semibold text-neutral-900 flex items-center justify-between">
              <span>Export Offline Backup</span>
              <button
                onClick={handleDownloadBackup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded hover:bg-neutral-800 font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .JSON</span>
              </button>
            </div>
            <p className="text-neutral-500 text-[11px]">
              Save a full copy of your cutting records, rates, masters, and inventory to your local computer.
            </p>
          </div>

          {/* Import Section */}
          <div className="border border-neutral-200 rounded-lg p-3.5 space-y-2">
            <div className="font-semibold text-neutral-900">Restore from Backup</div>
            <p className="text-neutral-500 text-[11px]">
              Select a previously saved .JSON backup file to restore:
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="block w-full text-xs text-neutral-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200 cursor-pointer"
            />
          </div>

          {/* Sample Data and Reset */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={handleLoadSamples}
              className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Load Rich Sample Lots</span>
            </button>

            <button
              onClick={handleResetClean}
              className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Reset to Clean State
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-950 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
