// src/components/ConfirmationModal.tsx

import React from 'react';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}) => {
  return (
    // Fondo oscuro semi-transparente que cubre toda la pantalla
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
      {/* Contenedor principal del modal */}
      <div className="w-full max-w-sm bg-gray-900 border-4 border-orange-500 rounded-2xl p-6 text-white text-center shadow-lg">
        <h1 className="font-cinzel text-2xl text-orange-300 mb-4">{title}</h1>
        <p className="text-gray-300 mb-8">{message}</p>
        
        {/* Botones de Acción */}
        <div className="flex gap-4">
          <button 
            onClick={onCancel} 
            className="w-full py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-bold transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;