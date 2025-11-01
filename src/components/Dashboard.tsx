import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase'; 
import RegisterTicketModal from './RegisterTicketModal';
import EditTicketModal from './EditTicketModal';
import ConfirmationModal from './ConfirmationModal';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { toast } from 'sonner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, ChartDataLabels);

type ActiveTabView = 'dashboard' | 'filtro';

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

const PRECIO_VIP = 40;
const PRECIO_GENERAL = 25;

const Dashboard: React.FC<{ user: { nombre: string } }> = ({ user }) => {
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTabView>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'tickets'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ticketsData: Ticket[] = [];
      querySnapshot.forEach((doc) => { ticketsData.push({ id: doc.id, ...doc.data() } as Ticket); });
      setAllTickets(ticketsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const summary = useMemo(() => {
    const ticketsVip = allTickets.filter(t => t.tipo === 'VIP').length;
    const ticketsGeneral = allTickets.filter(t => t.tipo === 'GEN').length;
    const pagados = allTickets.filter(t => t.estado === 'PAGADO').length;
    const porPagar = allTickets.filter(t => t.estado === 'POR_PAGAR').length;
    const gratis = allTickets.filter(t => t.estado === 'GRATIS').length;
    const totalRecaudado = allTickets.reduce((total, ticket) => {
        return total + (ticket.estado === 'PAGADO' ? (ticket.tipo === 'VIP' ? PRECIO_VIP : PRECIO_GENERAL) : 0);
    }, 0);
    return { ticketsVip, ticketsGeneral, totalVendidos: allTickets.length, pagados, porPagar, gratis, totalRecaudado };
  }, [allTickets]);

  const filteredTickets = useMemo(() => {
    const sorted = [...allTickets].sort((a, b) => (b.fechaRegistro?.toDate() || 0) - (a.fechaRegistro?.toDate() || 0));
    if (!searchTerm.trim()) return sorted;
    return sorted.filter(ticket => 
      ticket.nombreComprador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.numeroTicket.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allTickets, searchTerm]);

  const handleEditClick = (ticket: Ticket) => setTicketToEdit(ticket);
  const handleCloseEditModal = () => setTicketToEdit(null);
  const handleDeleteClick = (ticket: Ticket) => setTicketToDelete(ticket);
  const handleCloseDeleteModal = () => setTicketToDelete(null);

  const executeDelete = async () => {
    if (!ticketToDelete) return;
    handleCloseDeleteModal();
    const loadingToastId = toast.loading('Eliminando ticket...');
    try {
      const ticketRef = doc(db, 'tickets', ticketToDelete.id);
      await deleteDoc(ticketRef);
      toast.dismiss(loadingToastId);
      toast.success(`Ticket ${ticketToDelete.numeroTicket} eliminado con éxito.`);
    } catch (error) {
      toast.dismiss(loadingToastId);
      console.error("Error al eliminar el ticket: ", error);
      toast.error('Hubo un problema al eliminar el ticket.');
    }
  };

  const barChartData = {
    labels: ['VIP', 'General'],
    datasets: [{
      label: 'Ventas por Tipo',
      data: [summary.ticketsVip, summary.ticketsGeneral],
      backgroundColor: ['rgba(251, 113, 133, 0.8)', 'rgba(192, 132, 252, 0.8)'],
      borderColor: ['rgba(251, 113, 133, 1)', 'rgba(192, 132, 252, 1)'],
      borderWidth: 1,
    }],
  };
  const pieChartData = {
    labels: ['Pagados', 'Por Pagar', 'Gratis'],
    datasets: [{
      label: '# de Tickets',
      data: [summary.pagados, summary.porPagar, summary.gratis],
      backgroundColor: ['rgba(52, 211, 153, 0.8)', 'rgba(251, 191, 36, 0.8)', 'rgba(107, 114, 128, 0.8)'],
      borderColor: ['rgba(110, 231, 183, 1)', 'rgba(252, 211, 77, 1)', 'rgba(156, 163, 175, 1)'],
      borderWidth: 1,
    }],
  };
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        color: 'white',
        anchor: 'end' as const,
        align: 'end' as const,
        offset: -4,
        font: { weight: 'bold' as const },
        formatter: (value: number) => value > 0 ? value : '',
      },
    },
    scales: {
      y: { ticks: { color: 'white' }, grid: { color: 'rgba(255, 255, 255, 0.1)' }, min: 0 },
      x: { ticks: { color: 'white' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
    },
  };
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const, labels: { color: 'white' } },
      datalabels: {
        color: 'white',
        font: { weight: 'bold' as const, size: 14, },
        formatter: (value: number) => value > 0 ? value : '', 
      },
    },
  };

  if (loading) { return <div className="min-h-screen flex items-center justify-center text-white font-cinzel text-2xl">Cargando Datos...</div>; }
  
  return (
    <>
      <div className="text-white p-4 max-w-5xl mx-auto pb-40">
        <div className="flex justify-center border-b-2 border-orange-800 mb-8">
            <button onClick={() => setActiveTab('dashboard')} className={`font-cinzel text-xl py-2 px-6 transition-colors duration-300 ${activeTab === 'dashboard' ? 'text-orange-300 border-b-4 border-orange-400' : 'text-gray-500'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('filtro')} className={`font-cinzel text-xl py-2 px-6 transition-colors duration-300 ${activeTab === 'filtro' ? 'text-orange-300 border-b-4 border-orange-400' : 'text-gray-500'}`}>Filtro</button>
        </div>
        <h2 className="text-center text-xl mb-8">Bienvenido, <span className="font-bold text-orange-300">{user.nombre}</span></h2>
        <div>
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <div className="space-y-8">
                    <div className="border-4 border-orange-500 rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <h2 className="text-xl font-bold mb-4 text-orange-200">Resumen General</h2>
                      <ul className="space-y-2">
                        <li>Tickets VIP Vendidos: <span className="font-bold">{summary.ticketsVip} / 1000</span></li>
                        <li>Tickets Generales: <span className="font-bold">{summary.ticketsGeneral} / 1000</span></li>
                        <li className="pt-2 border-t border-gray-600">Total Tickets Vendidos: <span className="font-bold">{summary.totalVendidos} / 2000</span></li>
                        <li className="pt-2 border-t border-gray-600 font-bold text-orange-300">Total Recaudado: 
                          <span className="text-lg ml-2">{summary.totalRecaudado.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</span>
                        </li>
                      </ul>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div><p className="font-bold">Pagados</p><div className="bg-green-600 border-2 border-green-400 p-4 rounded-lg shadow-lg mt-2"><p className="text-3xl font-bold">{summary.pagados}</p></div></div>
                      <div><p className="font-bold">Por Pagar</p><div className="bg-yellow-600 border-2 border-yellow-400 p-4 rounded-lg shadow-lg mt-2"><p className="text-3xl font-bold">{summary.porPagar}</p></div></div>
                      <div><p className="font-bold">Gratis</p><div className="bg-gray-600 border-2 border-gray-400 p-4 rounded-lg shadow-lg mt-2"><p className="text-3xl font-bold">{summary.gratis}</p></div></div>
                    </div>
                    <button onClick={() => setIsRegisterModalOpen(true)} className="w-full py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-bold text-lg transition-transform transform hover:scale-105">
                        + Registrar Nuevo Ticket
                    </button>
                  </div>
                  <div className="space-y-8">
                    <div className="border-4 border-orange-500 rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.3)' }}><h3 className="text-lg font-bold mb-4 text-center text-orange-200">Ventas VIP vs. General</h3><div className="h-64"><Bar options={barChartOptions} data={barChartData} /></div></div>
                    <div className="border-4 border-orange-500 rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.3)' }}><h3 className="text-lg font-bold mb-4 text-center text-orange-200">Distribución de Pagos</h3><div className="h-64 w-64 mx-auto"><Pie data={pieChartData} options={pieChartOptions} /></div></div>
                  </div>
              </div>
            )}
            {activeTab === 'filtro' && (
              <div className="max-w-md mx-auto">
                <input type="text" placeholder="Buscar por Comprador o N° de Ticket..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-800 border-2 border-gray-600 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"/>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto mt-4">
                  {filteredTickets.map(ticket => (
                    <div key={ticket.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                      <div><p className="font-bold text-lg">{ticket.numeroTicket}</p><p className="text-gray-300">{ticket.nombreComprador}</p><p className="text-xs text-gray-500">Vendido por: {ticket.vendedorNombre}</p></div>
                      <div className='text-right'>
                        <p className={`font-semibold ${ticket.estado === 'PAGADO' ? 'text-green-400' : ticket.estado === 'POR_PAGAR' ? 'text-yellow-400' : 'text-gray-400'}`}>{ticket.estado}</p>
                        <div className="flex gap-3 mt-1 justify-end">
                            <button onClick={() => handleEditClick(ticket)} className="text-sm text-orange-400 hover:text-orange-300">Editar</button>
                            <button onClick={() => handleDeleteClick(ticket)} className="text-sm text-red-500 hover:text-red-400">Eliminar</button>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
      
      {isRegisterModalOpen && <RegisterTicketModal user={user} onClose={() => setIsRegisterModalOpen(false)} />}
      {ticketToEdit && <EditTicketModal user={user} ticket={ticketToEdit} onClose={handleCloseEditModal} />}
      {ticketToDelete && (
        <ConfirmationModal 
          title="Confirmar Eliminación"
          message={`¿Estás seguro de que deseas eliminar el ticket ${ticketToDelete.numeroTicket} a nombre de ${ticketToDelete.nombreComprador}? Esta acción no se puede deshacer.`}
          onConfirm={executeDelete}
          onCancel={handleCloseDeleteModal}
          confirmText="Sí, Eliminar"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </>
  );
};

export default Dashboard;