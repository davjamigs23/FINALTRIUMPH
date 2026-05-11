import React from 'react';
import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface FeedbackModalProps {
  title: string;
  message: string;
  type: 'confirm' | 'alert' | 'info' | 'error';
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export default function FeedbackModal({ title, message, type, onConfirm, onCancel, onClose }: FeedbackModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose || onCancel}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-8 py-6 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-black uppercase tracking-tight text-[#0d1b2a] flex items-center gap-2">
            {type === 'alert' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            {type === 'error' && <AlertTriangle className="h-5 w-5 text-red-500" />}
            {type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
            {type === 'confirm' && <CheckCircle className="h-5 w-5 text-[#1a237e]" />}
            {title}
          </h3>
          <button onClick={onClose || onCancel}><X className="h-6 w-6 text-gray-500" /></button>
        </div>
        <div className="p-8">
          <p className="text-gray-600 font-medium text-sm leading-relaxed">{message}</p>
        </div>
        <div className="px-8 py-6 bg-gray-50/50 flex justify-end gap-3">
          {type === 'confirm' && (
            <>
              <button 
                onClick={onCancel} 
                className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 font-bold text-[10px] uppercase tracking-widest hover:bg-gray-200"
              >Cancel</button>
              <button 
                onClick={onConfirm} 
                className="px-4 py-2 bg-[#1a237e] rounded-lg text-white font-bold text-[10px] uppercase tracking-widest hover:bg-[#1a237e]/90"
              >Confirm</button>
            </>
          )}
          {(type === 'alert' || type === 'info' || type === 'error') && (
            <button 
              onClick={onClose} 
              className="px-6 py-2 bg-[#1a237e] rounded-lg text-white font-bold text-[10px] uppercase tracking-widest hover:bg-[#1a237e]/90"
            >OK</button>
          )}
        </div>
      </div>
    </div>
  );
}
