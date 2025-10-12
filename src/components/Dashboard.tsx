import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase'; 
import RegisterTicketModal from './RegisterTicketModal';
import EditTicketModal from './EditTicketModal';

// Definimos los tipos de vista para las pestañas
type ActiveTabView = 'dashboard' | 'registros';

interface DashboardProps {
  user: {
    nombre: string;
  };
}

// Exportamos la interfaz para que EditTicketModal pueda usarla
export interface Ticket {
  id: string;
  tipo: 'VIP' | 'GEN';
  estado: 'PAGADO' | 'POR_PAGAR' | 'GRATIS';
  vendedorNombre: string;
  numeroTicket: string;
  nombreComprador: string;
  contactoComprador?: string;
  fechaRegistro: any; 
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTabView>('dashboard');
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);

  // useEffect para obtener TODOS los tickets (para el dashboard general)
  useEffect(() => {
    const q = query(collection(db, 'tickets'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ticketsData: Ticket[] = [];
      querySnapshot.forEach((doc) => {
        ticketsData.push({ id: doc.id, ...doc.data() } as Ticket);
      });
      setAllTickets(ticketsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // useEffect para obtener SOLO los tickets del usuario logueado
  useEffect(() => {
    if (activeTab === 'registros') {
      const q = query(collection(db, 'tickets'), where('vendedorNombre', '==', user.nombre));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userTicketsData: Ticket[] = [];
        querySnapshot.forEach((doc) => {
          userTicketsData.push({ id: doc.id, ...doc.data() } as Ticket);
        });
        userTicketsData.sort((a, b) => (b.fechaRegistro?.toDate() || 0) - (a.fechaRegistro?.toDate() || 0));
        setMyTickets(userTicketsData);
      });
      return () => unsubscribe();
    }
  }, [activeTab, user.nombre]);

  // Lógica de cálculo para el resumen general
  const summary = useMemo(() => {
    const ticketsVip = allTickets.filter(t => t.tipo === 'VIP').length;
    const ticketsGeneral = allTickets.filter(t => t.tipo === 'GEN').length;
    const pagados = allTickets.filter(t => t.estado === 'PAGADO').length;
    const porPagar = allTickets.filter(t => t.estado === 'POR_PAGAR').length;
    const gratis = allTickets.filter(t => t.estado === 'GRATIS').length;
    return { ticketsVip, ticketsGeneral, totalVendidos: allTickets.length, pagados, porPagar, gratis };
  }, [allTickets]);

  // Lógica para filtrar los registros del usuario según la búsqueda
  const filteredMyTickets = useMemo(() => {
    if (!searchTerm) return myTickets;
    return myTickets.filter(ticket => 
      ticket.nombreComprador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.numeroTicket.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [myTickets, searchTerm]);

  // Funciones para manejar la apertura y cierre del modal de edición
  const handleEditClick = (ticket: Ticket) => setTicketToEdit(ticket);
  const handleCloseEditModal = () => setTicketToEdit(null);


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white font-cinzel text-2xl">Cargando Datos...</div>;
  }
  
  return (
    <>
      <div className="text-white p-4 max-w-2xl mx-auto pb-40">
        <div className="flex justify-center border-b-2 border-orange-800 mb-8">
            <button 
                onClick={() => setActiveTab('dashboard')}
                className={`font-cinzel text-xl py-2 px-6 transition-colors duration-300 ${activeTab === 'dashboard' ? 'text-orange-300 border-b-4 border-orange-400' : 'text-gray-500'}`}
            >
                Dashboard
            </button>
            <button 
                onClick={() => setActiveTab('registros')}
                className={`font-cinzel text-xl py-2 px-6 transition-colors duration-300 ${activeTab === 'registros' ? 'text-orange-300 border-b-4 border-orange-400' : 'text-gray-500'}`}
            >
                Mis Registros
            </button>
        </div>

        <h2 className="text-center text-xl mb-8">
          Bienvenido, <span className="font-bold text-orange-300">{user.nombre}</span>
        </h2>

        {activeTab === 'dashboard' && (
          <div>
            <div className="border-4 border-orange-500 rounded-xl p-4 mb-8" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <h2 className="text-xl font-bold mb-4 text-orange-200">Resumen General</h2>
              <ul className="space-y-2">
                <li>Tickets VIP Vendidos: <span className="font-bold">{summary.ticketsVip} / 1000</span></li>
                <li>Tickets Generales: <span className="font-bold">{summary.ticketsGeneral} / 1000</span></li>
                <li className="pt-2 border-t border-gray-600">Total Tickets Vendidos: <span className="font-bold">{summary.totalVendidos} / 2000</span></li>
              </ul>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center mb-16">
              <div><p className="font-bold">Pagados</p><div className="bg-green-600 border-2 border-green-400 p-4 rounded-lg shadow-lg mt-2"><p className="text-3xl font-bold">{summary.pagados}</p></div></div>
              <div><p className="font-bold">Por Pagar</p><div className="bg-yellow-600 border-2 border-yellow-400 p-4 rounded-lg shadow-lg mt-2"><p className="text-3xl font-bold">{summary.porPagar}</p></div></div>
              <div><p className="font-bold">Gratis</p><div className="bg-gray-600 border-2 border-gray-400 p-4 rounded-lg shadow-lg mt-2"><p className="text-3xl font-bold">{summary.gratis}</p></div></div>
            </div>
            <button 
                onClick={() => setIsRegisterModalOpen(true)}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-bold text-lg transition-transform transform hover:scale-105"
            >
                + Registrar Nuevo Ticket
            </button>
          </div>
        )}

        {activeTab === 'registros' && (
          <div>
            <input 
              type="text"
              placeholder="Buscar por nombre o N° de ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border-2 border-gray-600 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {filteredMyTickets.map(ticket => (
                <div key={ticket.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">{ticket.numeroTicket}</p>
                    <p className="text-gray-300">{ticket.nombreComprador}</p>
                  </div>
                  <div className='text-right'>
                     <p className={`font-semibold ${ticket.estado === 'PAGADO' ? 'text-green-400' : ticket.estado === 'POR_PAGAR' ? 'text-yellow-400' : 'text-gray-400'}`}>{ticket.estado}</p>
                     <button onClick={() => handleEditClick(ticket)} className="text-sm text-orange-400 hover:text-orange-300 mt-1">Editar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isRegisterModalOpen && (
        <RegisterTicketModal 
          user={user} 
          onClose={() => setIsRegisterModalOpen(false)} 
        />
      )}
      {ticketToEdit && (
        <EditTicketModal
          user={user}
          ticket={ticketToEdit}
          onClose={handleCloseEditModal}
        />
      )}
    </>
  );
};

export default Dashboard;