import React, { useState } from 'react';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import type { Ticket } from './Dashboard'; 
import ConfirmationModal from './ConfirmationModal';

interface EditTicketModalProps {
  user: {
    nombre: string;
  };
  ticket: Ticket;
  onClose: () => void;
}

type TicketType = 'VIP' | 'GEN';
type PaymentStatus = 'PAGADO' | 'POR_PAGAR' | 'GRATIS';

const EditTicketModal: React.FC<EditTicketModalProps> = ({ user, ticket, onClose }) => {
  // Estados para los campos editables
  const [tipo, setTipo] = useState<TicketType>(ticket.tipo);
  const [estado, setEstado] = useState<PaymentStatus>(ticket.estado);
  const [nombreComprador, setNombreComprador] = useState(ticket.nombreComprador);
  const [contactoComprador, setContactoComprador] = useState(ticket.contactoComprador || '');
  
  // Nuevos estados para manejar la edición del número de ticket
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [numeroTicketPart, setNumeroTicketPart] = useState(ticket.numeroTicket.split('-')[1] || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Función que se llama al pulsar "Guardar Cambios"
  const handleGuardarCambios = () => {
    // Validaciones básicas
    if (!nombreComprador.trim()) {
      toast.error('El nombre del comprador no puede estar vacío.');
      return;
    }
    if (isEditingNumber && (!numeroTicketPart || numeroTicketPart.length !== 6)) {
      toast.error('El número de ticket debe tener 6 dígitos.');
      return;
    }
    // Si pasa las validaciones, abre el modal de confirmación
    setIsConfirmOpen(true);
  };

  // Función que se ejecuta al confirmar en el modal
  const executeSaveChanges = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    const loadingToastId = toast.loading('Validando y guardando cambios...');

    try {
      const nuevoNumeroTicket = `${tipo}-${numeroTicketPart}`;
      
      // Validación de duplicado (solo si el número ha cambiado)
      if (nuevoNumeroTicket !== ticket.numeroTicket) {
        const ticketsCollectionRef = collection(db, 'tickets');
        const q = query(ticketsCollectionRef, where('numeroTicket', '==', nuevoNumeroTicket));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          toast.dismiss(loadingToastId);
          toast.error(`¡Error! El ticket ${nuevoNumeroTicket} ya ha sido registrado.`);
          setIsSaving(false);
          return;
        }
      }
      
      const ticketRef = doc(db, 'tickets', ticket.id);
      const updatedData = {
        tipo,
        numeroTicket: nuevoNumeroTicket,
        estado,
        nombreComprador: nombreComprador.toUpperCase(),
        contactoComprador,
      };

      await updateDoc(ticketRef, updatedData);
      
      toast.dismiss(loadingToastId);
      toast.success('¡Ticket actualizado con éxito!');
      onClose();

    } catch (error) {
      toast.dismiss(loadingToastId);
      console.error("Error al actualizar el ticket: ", error);
      toast.error('Hubo un problema al guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  // Función para manejar el cambio en el input del número de ticket
  const handleNumeroTicketChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    setNumeroTicketPart(value);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
        <div className="w-full max-w-md bg-gray-900 border-4 border-orange-500 rounded-2xl p-6 text-white overflow-y-auto max-h-full">
          <h1 className="font-cinzel text-3xl text-center text-orange-300 mb-6">Editar Ticket</h1>

          <div className="mb-4 text-center">
            <p className="font-bold text-gray-400">Número de Ticket</p>
            {isEditingNumber ? (
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{tipo}-</span>
                <input type="text" value={numeroTicketPart} onChange={handleNumeroTicketChange} maxLength={6} className="pl-14 pr-4 w-full bg-transparent border-2 border-gray-600 rounded-lg py-2 text-center text-xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"/>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <p className="text-2xl font-bold tracking-widest">{ticket.numeroTicket}</p>
                <button onClick={() => setIsEditingNumber(true)} title="Modificar número">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400 hover:text-orange-300" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <p className="font-bold mb-2">Tipo de Ticket</p>
            <div className="flex gap-4">
              <button onClick={() => setTipo('VIP')} className={`w-full py-2 px-4 rounded-full text-sm font-bold transition-colors ${tipo === 'VIP' ? 'bg-orange-600 border-2 border-orange-400' : 'bg-gray-700 border-2 border-gray-600'}`}>VIP</button>
              <button onClick={() => setTipo('GEN')} className={`w-full py-2 px-4 rounded-full text-sm font-bold transition-colors ${tipo === 'GEN' ? 'bg-orange-600 border-2 border-orange-400' : 'bg-gray-700 border-2 border-gray-600'}`}>General</button>
            </div>
          </div>

          <div className="mb-4">
            <p className="font-bold mb-2">Estado de Pago</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setEstado('PAGADO')} className={`py-2 px-2 rounded-lg text-sm font-bold transition-colors ${estado === 'PAGADO' ? 'bg-green-600 border-2 border-green-400' : 'bg-gray-700 border-2 border-gray-600'}`}>Pagado</button>
              <button onClick={() => setEstado('POR_PAGAR')} className={`py-2 px-2 rounded-lg text-sm font-bold transition-colors ${estado === 'POR_PAGAR' ? 'bg-yellow-600 border-2 border-yellow-400' : 'bg-gray-700 border-2 border-gray-600'}`}>Por Pagar</button>
              <button onClick={() => setEstado('GRATIS')} className={`py-2 px-2 rounded-lg text-sm font-bold transition-colors ${estado === 'GRATIS' ? 'bg-gray-500 border-2 border-gray-400' : 'bg-gray-700 border-2 border-gray-600'}`}>Gratis</button>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="editNombreComprador" className="font-bold mb-2 block">Nombre del Comprador</label>
            <input id="editNombreComprador" type="text" value={nombreComprador} onChange={(e) => setNombreComprador(e.target.value)} placeholder="Escribe el nombre" className="uppercase w-full bg-transparent border-2 border-gray-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500"/>
          </div>
          <div className="mb-6">
            <label htmlFor="editContactoComprador" className="font-bold mb-2 block">Contacto (opcional)</label>
            <input id="editContactoComprador" type="text" value={contactoComprador} onChange={(e) => setContactoComprador(e.target.value)} placeholder="Teléfono/Email" className="w-full bg-transparent border-2 border-gray-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500"/>
          </div>
          
          <div className="flex gap-4 mt-8">
            <button onClick={onClose} className="w-full py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold transition-colors">Cancelar</button>
            <button onClick={handleGuardarCambios} disabled={isSaving} className="w-full py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-bold transition-colors disabled:bg-orange-900 disabled:cursor-not-allowed">
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>

      {isConfirmOpen && (
        <ConfirmationModal 
          title="Confirmar Cambios"
          message={`¿Estás seguro de guardar los cambios, ${user.nombre}?`}
          onConfirm={executeSaveChanges}
          onCancel={() => setIsConfirmOpen(false)}
          confirmText="Sí, Guardar"
        />
      )}
    </>
  );
};

export default EditTicketModal;