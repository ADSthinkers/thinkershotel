export type ClientStatus = 'VIP' | 'Regular' | 'Novo';
export type ReservationStatus = 'Confirmada' | 'Check-in' | 'Check-out' | 'Pendente' | 'Cancelada';
export type StayEventType = 'Check-in' | 'Check-out';
export type StayEventStatus = 'Aguardando' | 'Pendente' | 'Concluido';
export type RoomType = 'Standard' | 'Deluxe' | 'Suite Master' | 'Presidencial';

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalStays: number;
  lastStay: string;
  status: ClientStatus;
};

export type Reservation = {
  id: string;
  clientId?: string | null;
  guest: string;
  room: string;
  checkIn: string;
  checkOut: string;
  rawCheckIn?: string;
  rawCheckOut?: string;
  status: ReservationStatus;
  amount: string;
  rawAmount?: number;
};

export type StayEvent = {
  id: string;
  sourceId?: string;
  reservationId?: string | null;
  clientId?: string | null;
  guest: string;
  room: string;
  type: StayEventType;
  date?: string;
  time: string;
  status: StayEventStatus;
  phone: string;
};

export type OccupationPoint = {
  name: string;
  value: number;
};

export const ROOM_RATES: Record<RoomType, number> = {
  Standard: 200,
  Deluxe: 400,
  'Suite Master': 700,
  Presidencial: 1500,
};

export const INITIAL_CLIENTS: Client[] = [
  { id: 'CLI001', name: 'Ana Oliveira', email: 'ana.o@email.com', phone: '(11) 98765-4321', totalStays: 5, lastStay: '22 Mai 2026', status: 'VIP' },
  { id: 'CLI002', name: 'Carlos Silva', email: 'carlos.s@email.com', phone: '(11) 91234-5678', totalStays: 2, lastStay: '25 Mai 2026', status: 'Regular' },
  { id: 'CLI003', name: 'Juliana Costa', email: 'j.costa@email.com', phone: '(11) 99988-7766', totalStays: 12, lastStay: '20 Mai 2026', status: 'VIP' },
  { id: 'CLI004', name: 'Ricardo Dias', email: 'ricardo.d@email.com', phone: '(11) 98877-6655', totalStays: 1, lastStay: '24 Mai 2026', status: 'Novo' },
  { id: 'CLI005', name: 'Beatriz Santos', email: 'bea.s@email.com', phone: '(11) 97766-5544', totalStays: 8, lastStay: '20 Mai 2026', status: 'VIP' },
  { id: 'CLI006', name: 'Marcos Pires', email: 'm.pires@email.com', phone: '(11) 96655-4433', totalStays: 3, lastStay: '23 Mai 2026', status: 'Regular' },
  { id: 'CLI007', name: 'Mariana Lima', email: 'mariana.l@email.com', phone: '(11) 98765-4321', totalStays: 4, lastStay: '22 Mai 2026', status: 'VIP' },
  { id: 'CLI008', name: 'Roberto Souza', email: 'roberto.s@email.com', phone: '(11) 91234-5678', totalStays: 1, lastStay: '22 Mai 2026', status: 'Novo' },
  { id: 'CLI009', name: 'Fernanda Mello', email: 'fernanda.m@email.com', phone: '(11) 99988-7766', totalStays: 3, lastStay: '22 Mai 2026', status: 'Regular' },
  { id: 'CLI010', name: 'Lucas Guedes', email: 'lucas.g@email.com', phone: '(11) 98877-6655', totalStays: 2, lastStay: '22 Mai 2026', status: 'Regular' },
  { id: 'CLI011', name: 'Patricia Rocha', email: 'patricia.r@email.com', phone: '(11) 97766-5544', totalStays: 9, lastStay: '22 Mai 2026', status: 'VIP' },
];

export const INITIAL_RESERVATIONS: Reservation[] = [
  { id: '#1001', guest: 'Ana Oliveira', room: '102 - Deluxe', checkIn: '20 Mai 2026', checkOut: '22 Mai 2026', status: 'Confirmada', amount: 'R$ 850,00' },
  { id: '#1002', guest: 'Carlos Silva', room: '305 - Suite', checkIn: '18 Mai 2026', checkOut: '25 Mai 2026', status: 'Check-in', amount: 'R$ 2.400,00' },
  { id: '#1003', guest: 'Juliana Costa', room: '204 - Standard', checkIn: '19 Mai 2026', checkOut: '20 Mai 2026', status: 'Pendente', amount: 'R$ 320,00' },
  { id: '#1004', guest: 'Ricardo Dias', room: '108 - Deluxe', checkIn: '21 Mai 2026', checkOut: '24 Mai 2026', status: 'Confirmada', amount: 'R$ 1.200,00' },
  { id: '#1005', guest: 'Beatriz Santos', room: '401 - Presidencial', checkIn: '18 Mai 2026', checkOut: '20 Mai 2026', status: 'Check-out', amount: 'R$ 5.600,00' },
  { id: '#1006', guest: 'Marcos Pires', room: '105 - Standard', checkIn: '22 Mai 2026', checkOut: '23 Mai 2026', status: 'Cancelada', amount: 'R$ 280,00' },
];

export const INITIAL_CHECKINS: StayEvent[] = [
  { id: '#2001', guest: 'Mariana Lima', room: '104', type: 'Check-in', time: '14:00', status: 'Aguardando', phone: '(11) 98765-4321' },
  { id: '#2002', guest: 'Roberto Souza', room: '208', type: 'Check-in', time: '15:30', status: 'Aguardando', phone: '(11) 91234-5678' },
  { id: '#2003', guest: 'Fernanda Mello', room: '312', type: 'Check-out', time: '11:00', status: 'Pendente', phone: '(11) 99988-7766' },
  { id: '#2004', guest: 'Lucas Guedes', room: '101', type: 'Check-out', time: '10:30', status: 'Concluido', phone: '(11) 98877-6655' },
  { id: '#2005', guest: 'Patricia Rocha', room: '405', type: 'Check-in', time: '16:00', status: 'Concluido', phone: '(11) 97766-5544' },
];

export const WEEKLY_OCCUPATION: OccupationPoint[] = [
  { name: 'S', value: 400 },
  { name: 'T', value: 300 },
  { name: 'Q', value: 500 },
  { name: 'Q', value: 650 },
  { name: 'S', value: 450 },
  { name: 'S', value: 350 },
  { name: 'D', value: 200 },
];
