import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

import { Client, ClientStatus, ROOM_RATES, Reservation, RoomType, StayEvent, StayEventStatus, WEEKLY_OCCUPATION } from '@/data/hotelData';
import { apiRequest } from '@/services/api';

type NewClientInput = {
  name: string;
  email: string;
  phone: string;
  status: ClientStatus;
};

export type UserRole = 'Administrador' | 'Gerente' | 'Operacional';
export type UserStatus = 'Ativo' | 'Bloqueado';
export type UserAccount = {
  id: string;
  name: string;
  login: string;
  role: UserRole;
  status: UserStatus;
};

export type SystemLog = {
  id: number;
  usuario_id: number;
  usuario_login: string;
  tabela: string;
  operacao: string;
  registro_id: string;
  dados_anteriores: string | object | null;
  dados_novos: string | object | null;
  criado_em: string;
};

type UserInput = {
  name: string;
  login: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
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

type AuthUser = {
  id: number | string;
  login: string;
  nome: string;
  role: string;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

type ApiClient = {
  id: number | string;
  nome: string;
  email: string;
  telefone: string;
  status?: ClientStatus;
  totalHospedagens?: number;
  ultimaHospedagem?: string | null;
};

type ApiReservation = {
  id: number | string;
  clienteId?: number | string | null;
  hospede: string;
  quarto: string;
  checkIn: string;
  checkOut: string;
  status?: Reservation['status'];
  valorTotal?: number | string;
};

type ApiStayEvent = {
  id: number | string;
  reservaId?: number | string | null;
  reserva?: ApiReservation | null;
  hospede: string;
  quarto: string;
  data: string;
  horario?: string;
  status?: StayEventStatus;
  telefone?: string | null;
};

type ApiUser = {
  id: number | string;
  login: string;
  nome: string;
  perfil: string;
  ativo: boolean;
};

type HotelDataContextValue = {
  clients: Client[];
  reservations: Reservation[];
  checkIns: StayEvent[];
  users: UserAccount[];
  weeklyOccupation: typeof WEEKLY_OCCUPATION;
  authToken: string | null;
  authUser: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  refreshData: () => Promise<void>;
  getLogs: () => Promise<SystemLog[]>;
  addClient: (newClient: NewClientInput) => Promise<Client | null>;
  updateClient: (clientId: string, clientInput: NewClientInput) => Promise<Client | null>;
  deleteClient: (clientId: string) => Promise<void>;
  addReservation: (newReservation: NewReservationInput) => Promise<Reservation | null>;
  updateReservation: (reservationId: string, reservationInput: NewReservationInput) => Promise<Reservation | null>;
  addUser: (userInput: UserInput) => Promise<UserAccount | null>;
  updateUser: (userId: string, userInput: UserInput) => Promise<UserAccount | null>;
  cancelReservation: (reservationId: string) => Promise<void>;
  deleteReservation: (reservationId: string) => Promise<void>;
  performCheckInOrOut: (eventId: string, newStatus: StayEventStatus) => Promise<void>;
  getDashboardStats: () => DashboardStats;
  calculateReservationTotal: (checkIn: string, checkOut: string, roomType: RoomType) => { days: number; total: number };
};

const HotelDataContext = createContext<HotelDataContextValue | null>(null);

function formatDate(dateText?: string | null) {
  if (!dateText) return '-';
  const normalized = dateText.includes('T') ? dateText.split('T')[0] : dateText;
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateText;
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatMoney(value: number | string | undefined) {
  const numericValue = Number(value || 0);
  return `R$ ${numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function mapClient(client: ApiClient): Client {
  return {
    id: String(client.id),
    name: client.nome,
    email: client.email,
    phone: client.telefone,
    totalStays: client.totalHospedagens ?? 0,
    lastStay: formatDate(client.ultimaHospedagem),
    status: client.status || 'Novo',
  };
}

function mapReservation(reservation: ApiReservation): Reservation {
  const rawAmount = Number(reservation.valorTotal || 0);
  return {
    id: String(reservation.id),
    clientId: reservation.clienteId ? String(reservation.clienteId) : null,
    guest: reservation.hospede,
    room: reservation.quarto,
    checkIn: formatDate(reservation.checkIn),
    checkOut: formatDate(reservation.checkOut),
    rawCheckIn: reservation.checkIn,
    rawCheckOut: reservation.checkOut,
    status: reservation.status || 'Confirmada',
    amount: formatMoney(rawAmount),
    rawAmount,
  };
}

function mapStayEvent(event: ApiStayEvent, type: StayEvent['type']): StayEvent {
  return {
    id: `${type === 'Check-in' ? 'check-in' : 'check-out'}:${event.id}`,
    sourceId: String(event.id),
    reservationId: event.reservaId ? String(event.reservaId) : null,
    clientId: event.reserva?.clienteId ? String(event.reserva.clienteId) : null,
    guest: event.hospede,
    room: event.quarto.split(' - ')[0],
    type,
    date: event.data,
    time: event.horario || (type === 'Check-in' ? '14:00' : '11:00'),
    status: event.status || (type === 'Check-in' ? 'Aguardando' : 'Pendente'),
    phone: event.telefone || '-',
  };
}

function mapUser(user: ApiUser): UserAccount {
  const roleMap: Record<string, UserRole> = {
    admin: 'Administrador',
    administrador: 'Administrador',
    gerente: 'Gerente',
    operacional: 'Operacional',
  };

  return {
    id: String(user.id),
    name: user.nome,
    login: user.login,
    role: roleMap[user.perfil?.toLowerCase()] || 'Operacional',
    status: user.ativo ? 'Ativo' : 'Bloqueado',
  };
}

function toApiRole(role: UserRole) {
  if (role === 'Administrador') return 'admin';
  if (role === 'Gerente') return 'gerente';
  return 'operacional';
}

function splitStayEventId(eventId: string) {
  const [kind, rawId] = eventId.split(':');
  return {
    endpoint: kind === 'check-out' ? '/api/check-outs' : '/api/check-ins',
    id: rawId || eventId,
  };
}

export function HotelDataProvider({ children }: PropsWithChildren) {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [checkIns, setCheckIns] = useState<StayEvent[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateReservationTotal = useCallback((checkIn: string, checkOut: string, roomType: RoomType) => {
    if (!checkIn || !checkOut) return { days: 0, total: 0 };
    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);
    const diff = end.getTime() - start.getTime();
    if (Number.isNaN(diff) || diff <= 0) return { days: 0, total: 0 };
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return { days, total: days * ROOM_RATES[roomType] };
  }, []);

  const loadData = useCallback(async (token: string) => {
    const [apiClients, apiReservations, apiCheckIns, apiCheckOuts, apiUsers] = await Promise.all([
      apiRequest<ApiClient[]>('/api/clientes', { token }),
      apiRequest<ApiReservation[]>('/api/reservas', { token }),
      apiRequest<ApiStayEvent[]>('/api/check-ins', { token }),
      apiRequest<ApiStayEvent[]>('/api/check-outs', { token }),
      apiRequest<ApiUser[]>('/api/usuarios', { token }),
    ]);

    setClients(apiClients.map(mapClient));
    setReservations(apiReservations.map(mapReservation));
    setCheckIns([...apiCheckIns.map((event) => mapStayEvent(event, 'Check-in')), ...apiCheckOuts.map((event) => mapStayEvent(event, 'Check-out'))]);
    setUsers(apiUsers.map(mapUser));
  }, []);

  const refreshData = useCallback(async () => {
    if (!authToken) return;
    setIsLoading(true);
    setError(null);
    try {
      await loadData(authToken);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar dados.');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, loadData]);

  const getLogs = useCallback(async () => {
    if (!authToken) return [];
    return apiRequest<SystemLog[]>('/api/logs', { token: authToken });
  }, [authToken]);

  const login = useCallback(
    async (username: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiRequest<LoginResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ login: username, password }),
        });
        setAuthToken(response.token);
        setAuthUser(response.user);
        await loadData(response.token);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : 'Erro ao fazer login.';
        setError(message);
        throw requestError;
      } finally {
        setIsLoading(false);
      }
    },
    [loadData]
  );

  const addClient = useCallback(
    async (newClient: NewClientInput) => {
      if (!authToken) return null;
      const createdClient = await apiRequest<ApiClient>('/api/clientes', {
        method: 'POST',
        token: authToken,
        body: JSON.stringify({
          nome: newClient.name,
          email: newClient.email,
          telefone: newClient.phone,
          status: newClient.status,
        }),
      });
      const client = mapClient(createdClient);
      setClients((previous) => [client, ...previous]);
      return client;
    },
    [authToken]
  );

  const updateClient = useCallback(
    async (clientId: string, clientInput: NewClientInput) => {
      if (!authToken) return null;
      const updatedClient = await apiRequest<ApiClient>(`/api/clientes/${clientId}`, {
        method: 'PATCH',
        token: authToken,
        body: JSON.stringify({
          nome: clientInput.name,
          email: clientInput.email,
          telefone: clientInput.phone,
          status: clientInput.status,
        }),
      });
      await refreshData();
      return mapClient(updatedClient);
    },
    [authToken, refreshData]
  );

  const deleteClient = useCallback(
    async (clientId: string) => {
      if (!authToken) return;
      await apiRequest(`/api/clientes/${clientId}`, {
        method: 'DELETE',
        token: authToken,
      });
      await refreshData();
    },
    [authToken, refreshData]
  );

  const addReservation = useCallback(
    async (newReservation: NewReservationInput) => {
      if (!authToken) return null;
      const { days, total } = calculateReservationTotal(newReservation.checkIn, newReservation.checkOut, newReservation.roomType);
      if (days <= 0) return null;

      const clientRef = clients.find((client) => client.name === newReservation.guest);
      const createdReservation = await apiRequest<ApiReservation>('/api/reservas', {
        method: 'POST',
        token: authToken,
        body: JSON.stringify({
          clienteId: clientRef?.id ? Number(clientRef.id) : null,
          hospede: newReservation.guest,
          quarto: `${newReservation.roomNumber} - ${newReservation.roomType}`,
          checkIn: newReservation.checkIn,
          checkOut: newReservation.checkOut,
          status: 'Confirmada',
          valorTotal: total,
        }),
      });

      await apiRequest<ApiStayEvent>('/api/check-ins', {
        method: 'POST',
        token: authToken,
        body: JSON.stringify({
          reservaId: createdReservation.id,
          hospede: newReservation.guest,
          quarto: newReservation.roomNumber,
          data: newReservation.checkIn,
          horario: '14:00',
          status: 'Aguardando',
          telefone: clientRef?.phone || null,
        }),
      });

      await refreshData();
      return mapReservation(createdReservation);
    },
    [authToken, calculateReservationTotal, clients, refreshData]
  );

  const updateReservation = useCallback(
    async (reservationId: string, reservationInput: NewReservationInput) => {
      if (!authToken) return null;
      const { days, total } = calculateReservationTotal(reservationInput.checkIn, reservationInput.checkOut, reservationInput.roomType);
      if (days <= 0) return null;

      const clientRef = clients.find((client) => client.name === reservationInput.guest);
      const updatedReservation = await apiRequest<ApiReservation>(`/api/reservas/${reservationId}`, {
        method: 'PATCH',
        token: authToken,
        body: JSON.stringify({
          clienteId: clientRef?.id ? Number(clientRef.id) : null,
          hospede: reservationInput.guest,
          quarto: `${reservationInput.roomNumber} - ${reservationInput.roomType}`,
          checkIn: reservationInput.checkIn,
          checkOut: reservationInput.checkOut,
          valorTotal: total,
        }),
      });

      await refreshData();
      return mapReservation(updatedReservation);
    },
    [authToken, calculateReservationTotal, clients, refreshData]
  );

  const addUser = useCallback(
    async (userInput: UserInput) => {
      if (!authToken) return null;
      const createdUser = await apiRequest<ApiUser>('/api/usuarios', {
        method: 'POST',
        token: authToken,
        body: JSON.stringify({
          nome: userInput.name,
          login: userInput.login,
          perfil: toApiRole(userInput.role),
          ativo: userInput.status === 'Ativo',
          password: userInput.password,
        }),
      });
      await refreshData();
      return mapUser(createdUser);
    },
    [authToken, refreshData]
  );

  const updateUser = useCallback(
    async (userId: string, userInput: UserInput) => {
      if (!authToken) return null;
      const updatedUser = await apiRequest<ApiUser>(`/api/usuarios/${userId}`, {
        method: 'PATCH',
        token: authToken,
        body: JSON.stringify({
          nome: userInput.name,
          login: userInput.login,
          perfil: toApiRole(userInput.role),
          ativo: userInput.status === 'Ativo',
          ...(userInput.password ? { password: userInput.password } : {}),
        }),
      });
      await refreshData();
      return mapUser(updatedUser);
    },
    [authToken, refreshData]
  );

  const cancelReservation = useCallback(
    async (reservationId: string) => {
      if (!authToken) return;
      await apiRequest<ApiReservation>(`/api/reservas/${reservationId}/cancelar`, {
        method: 'PATCH',
        token: authToken,
      });
      await refreshData();
    },
    [authToken, refreshData]
  );

  const deleteReservation = useCallback(
    async (reservationId: string) => {
      if (!authToken) return;
      await apiRequest(`/api/reservas/${reservationId}`, {
        method: 'DELETE',
        token: authToken,
      });
      await refreshData();
    },
    [authToken, refreshData]
  );

  const performCheckInOrOut = useCallback(
    async (eventId: string, newStatus: StayEventStatus) => {
      if (!authToken) return;
      const { endpoint, id } = splitStayEventId(eventId);
      const currentEvent = checkIns.find((event) => event.id === eventId);
      const linkedReservation = currentEvent?.reservationId ? reservations.find((reservation) => reservation.id === currentEvent.reservationId) : null;
      const checkoutAlreadyExists = currentEvent?.reservationId
        ? checkIns.some((event) => event.type === 'Check-out' && event.reservationId === currentEvent.reservationId)
        : false;

      await apiRequest(`${endpoint}/${id}${newStatus === 'Concluido' ? '/concluir' : ''}`, {
        method: 'PATCH',
        token: authToken,
        body: newStatus === 'Concluido' ? undefined : JSON.stringify({ status: newStatus }),
      });

      if (newStatus === 'Concluido' && currentEvent?.type === 'Check-in' && currentEvent.reservationId && !checkoutAlreadyExists) {
        await apiRequest<ApiStayEvent>('/api/check-outs', {
          method: 'POST',
          token: authToken,
          body: JSON.stringify({
            reservaId: Number(currentEvent.reservationId),
            hospede: currentEvent.guest,
            quarto: currentEvent.room,
            data: linkedReservation?.rawCheckOut || currentEvent.date || new Date().toISOString().slice(0, 10),
            horario: '11:00',
            status: 'Pendente',
            telefone: currentEvent.phone === '-' ? null : currentEvent.phone,
          }),
        });
      }
      await refreshData();
    },
    [authToken, checkIns, refreshData, reservations]
  );

  const getDashboardStats = useCallback(
    () => ({
      totalReservations: reservations.length,
      checkInsHoje: checkIns.filter((item) => item.type === 'Check-in').length,
      checkOutsHoje: checkIns.filter((item) => item.type === 'Check-out').length,
      occupiedRooms: reservations.filter((reservation) => reservation.status === 'Check-in').length,
    }),
    [checkIns, reservations]
  );

  const value = useMemo(
    () => ({
      clients,
      reservations,
      checkIns,
      users,
      weeklyOccupation: WEEKLY_OCCUPATION,
      authToken,
      authUser,
      isLoading,
      error,
      login,
      refreshData,
      getLogs,
      addClient,
      updateClient,
      deleteClient,
      addReservation,
      updateReservation,
      addUser,
      updateUser,
      cancelReservation,
      deleteReservation,
      performCheckInOrOut,
      getDashboardStats,
      calculateReservationTotal,
    }),
    [
      clients,
      reservations,
      checkIns,
      users,
      authToken,
      authUser,
      isLoading,
      error,
      login,
      refreshData,
      getLogs,
      addClient,
      updateClient,
      deleteClient,
      addReservation,
      updateReservation,
      addUser,
      updateUser,
      cancelReservation,
      deleteReservation,
      performCheckInOrOut,
      getDashboardStats,
      calculateReservationTotal,
    ]
  );

  return <HotelDataContext.Provider value={value}>{children}</HotelDataContext.Provider>;
}

export function useHotelData() {
  const context = useContext(HotelDataContext);
  if (!context) throw new Error('useHotelData deve ser usado dentro de HotelDataProvider');
  return context;
}
