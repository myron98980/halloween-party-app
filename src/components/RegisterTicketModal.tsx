import React, { useState } from 'react';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import calabaza from '../assets/calabaza.png';
import { toast } from 'sonner';

// Definimos las props que recibirá el modal
interface RegisterTicketModalProps {
  user: {
    nombre: string;
  };
  onClose: () => void;
}

// Definimos los tipos para nuestros estados del formulario
type TicketType = 'VIP' | 'GEN';
type PaymentStatus = 'PAGADO' | 'POR_PAGAR' | 'GRATIS';

// Nueva interfaz para manejar el estado de cada ticket individualmente
interface TicketInput {
  numero: string;
  estado: PaymentStatus;
}

const RegisterTicketModal: React.FC<RegisterTicketModalProps> = ({ user, onClose }) => {
  // Estados para los campos generales del formulario
  const [tipo, setTipo] = useState<TicketType>('VIP');
  // Estado principal: un array de objetos, cada uno representando un ticket
  const [tickets, setTickets] = useState<TicketInput[]>([{ numero: '', estado: 'PAGADO' }]);
  const [nombreComprador, setNombreComprador] = useState('');
  const [contactoComprador, setContactoComprador] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Función para manejar cambios en los campos de un ticket específico (número o estado)
  const handleTicketChange = (index: number, field: keyof TicketInput, value: string) => {
    const newTickets = [...tickets];
    const ticketToUpdate = newTickets[index];
    
    if (field === 'numero') {
      ticketToUpdate.numero = value.replace(/[^0-9]/g, '').slice(0, 6);
    } else {
      ticketToUpdate.estado = value as PaymentStatus;
    }
    setTickets(newTickets);
  };

  // Función para añadir un nuevo campo de ticket al formulario
  const addTicketField = () => {
    setTickets([...tickets, { numero: '', estado: 'PAGADO' }]);
  };

  // Función para eliminar un campo de ticket del formulario
  const removeTicketField = (index: number) => {
    if (tickets.length > 1) {
      const newTickets = tickets.filter((_, i) => i !== index);
      setTickets(newTickets);
    }
  };

  // Función para manejar el guardado de todos los tickets en Firebase
  const handleGuardarTicket = async () => {
    // Validaciones
    if (!nombreComprador.trim()) {
      toast.error('Por favor, ingresa el nombre del comprador.');
      return;
    }
    if (tickets.some(t => !t.numero || t.numero.length !== 6)) {
      toast.error('Todos los números de ticket deben tener exactamente 6 dígitos.');
      return;
    }
    
    setIsSaving(true);
    const loadingToastId = toast.loading('Registrando y validando tickets...');

    try {
      // Validación de duplicados
      const ticketsCollectionRef = collection(db, 'tickets');
      for (const ticket of tickets) {
        const numeroCompleto = `${tipo}-${ticket.numero}`;
        const q = query(ticketsCollectionRef, where('numeroTicket', '==', numeroCompleto));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          toast.dismiss(loadingToastId);
          toast.error(`¡Error! El ticket ${numeroCompleto} ya ha sido registrado.`);
          setIsSaving(false);
          return;
        }
      }

      // Guardado en lote
      const batch = writeBatch(db);
      tickets.forEach(ticket => {
        const ticketData = {
          tipo,
          numeroTicket: `${tipo}-${ticket.numero}`,
          estado: ticket.estado, // Se usa el estado individual de cada ticket
          nombreComprador: nombreComprador.toUpperCase(),
          contactoComprador,
          vendedorNombre: user.nombre,
          fechaRegistro: new Date(),
        };
        const newTicketRef = doc(collection(db, 'tickets'));
        batch.set(newTicketRef, ticketData);
      });

      await batch.commit();
      toast.dismiss(loadingToastId);
      toast.success(`¡${tickets.length} ticket(s) registrado(s) con éxito!`);
      onClose();

    } catch (error) {
      toast.dismiss(loadingToastId);
      console.error("Error al guardar el/los ticket(s): ", error);
      toast.error('Hubo un problema al registrar. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-gray-900 border-4 border-orange-500 rounded-2xl p-6 text-white overflow-y-auto max-h-full">
        <h1 className="font-cinzel text-3xl text-center text-orange-300 mb-2">Registrar Nuevo Ticket</h1>
        <div className="flex justify-center items-center mb-6">
          <img src={calabaza} alt="Calabaza" className="w-12 h-12"/>
        </div>

        <div className="mb-4">
          <p className="font-bold mb-2">Tipo de Ticket</p>
          <div className="flex gap-4">
            <button onClick={() => setTipo('VIP')} className={`py-2 px-4 rounded-full text-sm font-bold w-full transition-colors ${tipo === 'VIP' ? 'bg-orange-600 border-2 border-orange-400' : 'bg-gray-700 border-2 border-gray-600'}`}>VIP</button>
            <button onClick={() => setTipo('GEN')} className={`py-2 px-4 rounded-full text-sm font-bold w-full transition-colors ${tipo === 'GEN' ? 'bg-orange-600 border-2 border-orange-400' : 'bg-gray-700 border-2 border-gray-600'}`}>General</button>
          </div>
        </div>

        <div className="mb-4 space-y-4">
            {tickets.map((ticket, index) => (
                <div key={index} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <label className="font-bold">Ticket #{index + 1}</label>
                        {tickets.length > 1 && (
                            <button onClick={() => removeTicketField(index)} className="p-1 bg-red-800 hover:bg-red-700 rounded-full flex items-center justify-center h-6 w-6">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                    <div className="relative mb-3">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{tipo}-</span>
                        <input type="text" value={ticket.numero} onChange={(e) => handleTicketChange(index, 'numero', e.target.value)} placeholder="000000" maxLength={6} className="pl-14 pr-4 w-full bg-transparent border-2 border-gray-600 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"/>
                    </div>
                    <div>
                        <p className="text-sm font-bold mb-1 text-gray-300">Estado de Pago</p>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => handleTicketChange(index, 'estado', 'PAGADO')} className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors ${ticket.estado === 'PAGADO' ? 'bg-green-600 border-2 border-green-400' : 'bg-gray-700 border-2 border-gray-600'}`}>Pagado</button>
                            <button onClick={() => handleTicketChange(index, 'estado', 'POR_PAGAR')} className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors ${ticket.estado === 'POR_PAGAR' ? 'bg-yellow-600 border-2 border-yellow-400' : 'bg-gray-700 border-2 border-gray-600'}`}>Por Pagar</button>
                            <button onClick={() => handleTicketChange(index, 'estado', 'GRATIS')} className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors ${ticket.estado === 'GRATIS' ? 'bg-gray-500 border-2 border-gray-400' : 'bg-gray-700 border-2 border-gray-600'}`}>Gratis</button>
                        </div>
                    </div>
                </div>
            ))}
            <button onClick={addTicketField} className="text-sm text-orange-400 hover:text-orange-300 font-bold">+ Añadir otro ticket</button>
        </div>
        
        <div className="mb-4">
            <label htmlFor="nombreComprador" className="font-bold mb-2 block">Nombre del Comprador</label>
            <input id="nombreComprador" type="text" value={nombreComprador} onChange={(e) => setNombreComprador(e.target.value)} placeholder="Escribe el nombre" className="uppercase w-full bg-transparent border-2 border-gray-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500"/>
        </div>
        <div className="mb-6">
            <label htmlFor="contactoComprador" className="font-bold mb-2 block">Contacto del Comprador (opcional)</label>
            <input id="contactoComprador" type="text" value={contactoComprador} onChange={(e) => setContactoComprador(e.target.value)} placeholder="Teléfono/Email" className="w-full bg-transparent border-2 border-gray-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500"/>
        </div>

        <div className="bg-black bg-opacity-30 p-4 rounded-lg mb-6 border border-gray-700 text-sm">
            <p className="font-bold text-orange-200 mb-2">Resumen de la Venta:</p>
            <p><strong>Comprador:</strong> {nombreComprador.toUpperCase()}</p>
            <p><strong>Cantidad de Tickets:</strong> {tickets.length}</p>
        </div>
        
        <div className="flex gap-4">
          <button onClick={onClose} className="w-full py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold transition-colors">Cancelar</button>
          <button onClick={handleGuardarTicket} disabled={isSaving} className="w-full py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-bold transition-colors disabled:bg-orange-900 disabled:cursor-not-allowed">
            {isSaving ? 'Guardando...' : 'Guardar Ticket(s)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterTicketModal;