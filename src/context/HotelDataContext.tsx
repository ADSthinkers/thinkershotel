import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import {
  Client,
  ClientStatus,
  INITIAL_CHECKINS,
  INITIAL_CLIENTS,
  INITIAL_RESERVATIONS,
  ROOM_RATES,
  Reservation,
  RoomType,
  StayEvent,
  StayEventStatus,
  WEEKLY_OCCUPATION,
} from '@/data/hotelData';

type NewClientInput = {
  name: string;
  email: string;
  phone: string;
  status: ClientStatus;
};

type NewReservationInput = {
  guest: string;
  roomNumber: string;
  roomType: RoomType;
  checkIn: string;
  checkOut: string;
};

type DashboardStats = {
  totalReservations: number;
  checkInsHoje: number;
  checkOutsHoje: number;
  occupiedRooms: number;
};

type HotelDataContextValue = {
  clients: Client[];
  reservations: Reservation[];
  checkIns: StayEvent[];
  weeklyOccupation: typeof WEEKLY_OCCUPATION;
  addClient: (newClient: NewClientInput) => Client;
  addReservation: (newReservation: NewReservationInput) => Reservation | null;
  performCheckInOrOut: (eventId: string, newStatus: StayEventStatus) => void;
  getDashboardStats: () => DashboardStats;
  calculateReservationTotal: (checkIn: string, checkOut: string, roomType: RoomType) => { days: number; total: number };
};

const HotelDataContext = createContext<HotelDataContextValue | null>(null);

function formatDate(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateText;
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatMoney(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export function HotelDataProvider({ children }: PropsWithChildren) {
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [reservations, setReservations] = useState<Reservation[]>(INITIAL_RESERVATIONS);
  const [checkIns, setCheckIns] = useState<StayEvent[]>(INITIAL_CHECKINS);

  const calculateReservationTotal = (checkIn: string, checkOut: string, roomType: RoomType) => {
    if (!checkIn || !checkOut) return { days: 0, total: 0 };
    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);
    const diff = end.getTime() - start.getTime();
    if (Number.isNaN(diff) || diff <= 0) return { days: 0, total: 0 };
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return { days, total: days * ROOM_RATES[roomType] };
  };

  const addClient = (newClient: NewClientInput) => {
    const formattedClient: Client = {
      id: `CLI${String(clients.length + 1).padStart(3, '0')}`,
      totalStays: 0,
      lastStay: '-',
      ...newClient,
    };
    setClients((previous) => [formattedClient, ...previous]);
    return formattedClient;
  };

  const addReservation = (newReservation: NewReservationInput) => {
    const { days, total } = calculateReservationTotal(newReservation.checkIn, newReservation.checkOut, newReservation.roomType);
    if (days <= 0) return null;

    const reservation: Reservation = {
      id: `#${1000 + reservations.length + 1}`,
      guest: newReservation.guest,
      room: `${newReservation.roomNumber} - ${newReservation.roomType}`,
      checkIn: formatDate(newReservation.checkIn),
      checkOut: formatDate(newReservation.checkOut),
      status: 'Confirmada',
      amount: formatMoney(total),
    };

    setReservations((previous) => [reservation, ...previous]);

    const clientRef = clients.find((client) => client.name === newReservation.guest);
    const dailyEvent: StayEvent = {
      id: `#200${checkIns.length + 1}`,
      guest: newReservation.guest,
      room: newReservation.roomNumber,
      type: 'Check-in',
      time: '14:00',
      status: 'Aguardando',
      phone: clientRef?.phone || '(11) 99999-9999',
    };
    setCheckIns((previous) => [dailyEvent, ...previous]);
    return reservation;
  };

  const performCheckInOrOut = (eventId: string, newStatus: StayEventStatus) => {
    const event = checkIns.find((item) => item.id === eventId);

    setCheckIns((previous) => previous.map((item) => (item.id === eventId ? { ...item, status: newStatus } : item)));

    if (!event) return;
    setReservations((previous) =>
      previous.map((reservation) => {
        if (reservation.guest !== event.guest || !reservation.room.includes(event.room)) return reservation;
        if (newStatus === 'Concluido') {
          return { ...reservation, status: event.type === 'Check-in' ? 'Check-in' : 'Check-out' };
        }
        if (newStatus === 'Pendente') return { ...reservation, status: 'Pendente' };
        return reservation;
      })
    );
  };

  const getDashboardStats = () => ({
    totalReservations: reservations.length,
    checkInsHoje: checkIns.filter((item) => item.type === 'Check-in').length,
    checkOutsHoje: checkIns.filter((item) => item.type === 'Check-out').length,
    occupiedRooms: reservations.filter((reservation) => reservation.status === 'Check-in').length,
  });

  const value = useMemo(
    () => ({
      clients,
      reservations,
      checkIns,
      weeklyOccupation: WEEKLY_OCCUPATION,
      addClient,
      addReservation,
      performCheckInOrOut,
      getDashboardStats,
      calculateReservationTotal,
    }),
    [clients, reservations, checkIns]
  );

  return <HotelDataContext.Provider value={value}>{children}</HotelDataContext.Provider>;
}

export function useHotelData() {
  const context = useContext(HotelDataContext);
  if (!context) throw new Error('useHotelData deve ser usado dentro de HotelDataProvider');
  return context;
}
