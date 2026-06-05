import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { GlassContainer, GlassView } from 'expo-glass-effect';
import * as Notifications from 'expo-notifications';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserAccount, UserRole, UserStatus, SystemLog, useHotelData } from '@/context/HotelDataContext';
import { Client, ClientStatus, Reservation, ReservationStatus, ROOM_RATES, RoomType, StayEvent } from '@/data/hotelData';

type TabKey = 'dashboard' | 'reservas' | 'checkin' | 'clientes' | 'config';
type CheckFilter = 'all' | 'in' | 'out';
type NativeTabParamList = {
  dashboard: undefined;
  reservas: undefined;
  checkin: undefined;
  clientes: undefined;
  config: undefined;
};
type DetailTarget =
  | { type: 'reservation'; id: string }
  | { type: 'client'; id: string }
  | { type: 'stay'; id: string }
  | { type: 'profile' }
  | { type: 'logs' }
  | null;
type ProfileData = {
  name: string;
  role: string;
  email: string;
  phone: string;
  hotelName: string;
  region: string;
  timezone: string;
  currency: string;
};
type AppNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'reserva' | 'checkin' | 'sistema';
};
type SegmentOption<T extends string> = {
  label: string;
  value: T;
};
type HotelOption = {
  hotelName: string;
  region: string;
  timezone: string;
  currency: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const tabs: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'dashboard', label: 'Inicio', icon: { ios: 'chart.bar', android: 'dashboard', web: 'dashboard' } },
  { key: 'reservas', label: 'Reservas', icon: { ios: 'calendar.badge.clock', android: 'calendar_month', web: 'calendar_month' } },
  { key: 'checkin', label: 'Check-in', icon: { ios: 'door.left.hand.open', android: 'login', web: 'login' } },
  { key: 'clientes', label: 'Clientes', icon: { ios: 'person.2', android: 'group', web: 'group' } },
  { key: 'config', label: 'Config', icon: { ios: 'gearshape', android: 'settings', web: 'settings' } },
];

const roomTypes = Object.keys(ROOM_RATES) as RoomType[];
const hotelOptions: HotelOption[] = [
  { hotelName: 'Thinkers Hotel Paulista', region: 'São Paulo, Brasil', timezone: 'America/Sao_Paulo', currency: 'BRL' },
  { hotelName: 'Thinkers Hotel Jardins', region: 'São Paulo, Brasil', timezone: 'America/Sao_Paulo', currency: 'BRL' },
  { hotelName: 'Thinkers Hotel Rio', region: 'Rio de Janeiro, Brasil', timezone: 'America/Sao_Paulo', currency: 'BRL' },
  { hotelName: 'Thinkers Hotel Lisboa', region: 'Lisboa, Portugal', timezone: 'Europe/Lisbon', currency: 'EUR' },
];
type IconName = SymbolViewProps['name'];
const VisualContext = createContext({ darkMode: false });

function useVisual() {
  return useContext(VisualContext);
}

function getIOSMajorVersion() {
  if (Platform.OS !== 'ios') {
    return 0;
  }

  const version = String(Platform.Version);
  return Number(version.split('.')[0]) || 0;
}

const liquidGlassEnabled = Platform.OS === 'ios' && getIOSMajorVersion() >= 26;
const NativeTab = createNativeBottomTabNavigator<NativeTabParamList>();

function AppIcon({ name, size = 24, color = colors.secondary }: { name: IconName; size?: number; color?: string }) {
  return <SymbolView name={name} size={size} tintColor={color} weight="thin" fallback={<Text style={[styles.fallbackIcon, { color, fontSize: size }]}>•</Text>} />;
}

function LiquidSurface({
  children,
  style,
  interactive,
  tintColor,
}: {
  children: ReactNode;
  style?: object | object[];
  interactive?: boolean;
  tintColor?: string;
}) {
  const { darkMode } = useVisual();

  if (!liquidGlassEnabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <GlassView
      glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.22 }}
      colorScheme={darkMode ? 'dark' : 'light'}
      tintColor={tintColor || (darkMode ? 'rgba(30, 101, 77, 0.36)' : 'rgba(255, 255, 255, 0.52)')}
      isInteractive={interactive}
      style={style}>
      {children}
    </GlassView>
  );
}

function LiquidButton({
  label,
  onPress,
  disabled,
  style,
  textStyle,
  children,
  tintColor,
}: {
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: object | object[];
  textStyle?: object | object[];
  children?: ReactNode;
  tintColor?: string;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [pressed && styles.liquidPressed]}>
      <LiquidSurface interactive={!disabled} tintColor={tintColor} style={[styles.liquidButtonSurface, style, liquidGlassEnabled && styles.liquidIOSSurface, disabled && styles.disabledButton]}>
        {children || <Text style={[styles.primaryButtonText, textStyle, liquidGlassEnabled && styles.liquidButtonText]}>{label}</Text>}
      </LiquidSurface>
    </Pressable>
  );
}

function LiquidToggle({ value, onValueChange }: { value: boolean; onValueChange: (value: boolean) => void }) {
  const { darkMode } = useVisual();

  return (
    <Pressable onPress={() => onValueChange(!value)} style={styles.togglePressable}>
      <LiquidSurface interactive tintColor={value ? 'rgba(126, 217, 155, 0.62)' : 'rgba(255, 255, 255, 0.74)'} style={[styles.switchGlassShell, darkMode && styles.liquidToggleTrackDark]}>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: 'rgba(255,255,255,0.24)', true: colors.primary }}
          thumbColor={value ? '#FFFFFF' : '#F7FAF8'}
          ios_backgroundColor="rgba(255,255,255,0.24)"
        />
      </LiquidSurface>
    </Pressable>
  );
}

function ScreenScroll({ children, bottomInset }: { children: ReactNode; bottomInset: number }) {
  const { darkMode } = useVisual();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.ScrollView contentContainerStyle={[styles.screenContent, { paddingBottom: 104 + bottomInset }]} style={[darkMode && styles.darkScreen, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.ScrollView>
  );
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addCalendarMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const totalDays = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const leadingEmptyDays = firstDay.getDay();
  return [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => new Date(monthDate.getFullYear(), monthDate.getMonth(), index + 1)),
  ];
}

function formatStatus(status: ReservationStatus | ClientStatus | StayEvent['status']) {
  return status === 'Concluido' ? 'Concluído' : status;
}

function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function confirmAction(title: string, message: string, onConfirm: () => void | Promise<void>, destructive?: boolean) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Voltar', style: 'cancel' },
    { text: 'Confirmar', style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

async function sendSystemNotification(title: string, body: string) {
  if (Platform.OS === 'web') {
    if ('Notification' in window && Notification.permission !== 'denied') {
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    }
    return;
  }

  const permission = await Notifications.getPermissionsAsync();
  const finalPermission = permission.granted ? permission : await Notifications.requestPermissionsAsync();
  if (!finalPermission.granted) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null,
  });
}

function Header({ title, subtitle, actionLabel, onAction }: { title: string; subtitle: string; actionLabel?: string; onAction?: () => void }) {
  const { darkMode } = useVisual();
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={[styles.title, darkMode && styles.titleDark]}>{title}</Text>
        <Text style={[styles.subtitle, darkMode && styles.subtitleDark]}>{subtitle}</Text>
      </View>
      {actionLabel && onAction ? (
        <LiquidButton label={actionLabel} onPress={onAction} style={styles.primaryButton} />
      ) : null}
    </View>
  );
}

function SearchBox({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  const { darkMode } = useVisual();
  return (
    <View style={[styles.searchBox, darkMode && styles.surfaceDark]}>
      <AppIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={21} color={colors.muted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={darkMode ? '#94A69C' : colors.muted} style={[styles.searchInput, darkMode && styles.inputTextDark]} />
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  const { darkMode } = useVisual();
  return (
    <View style={[styles.statCard, darkMode && styles.surfaceDark]}>
      <Text style={[styles.statValue, darkMode && styles.titleDark]}>{value}</Text>
      <Text style={[styles.statLabel, darkMode && styles.subtitleDark]}>{label}</Text>
    </View>
  );
}

function AnimatedChartBar({ height, color }: { height: number; color: string }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return <Animated.View style={[styles.chartBar, { height: progress.interpolate({ inputRange: [0, 1], outputRange: [6, height] }), backgroundColor: color }]} />;
}

function StatusBadge({ status }: { status: ReservationStatus | ClientStatus | StayEvent['status'] }) {
  const variant =
    status === 'VIP' || status === 'Check-in' || status === 'Concluido'
      ? styles.badgePositive
      : status === 'Pendente' || status === 'Aguardando'
        ? styles.badgeWarning
        : status === 'Cancelada'
          ? styles.badgeDanger
          : styles.badgeNeutral;

  return (
    <View style={[styles.badge, variant]}>
      <Text style={styles.badgeText}>{formatStatus(status)}</Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  const { darkMode } = useVisual();
  return (
    <View style={[styles.emptyState, darkMode && styles.surfaceDark]}>
      <Text style={[styles.emptyText, darkMode && styles.subtitleDark]}>{text}</Text>
    </View>
  );
}

function ReservationCard({ reservation, onPress }: { reservation: Reservation; onPress: () => void }) {
  const { darkMode } = useVisual();
  return (
    <Pressable style={[styles.card, darkMode && styles.surfaceDark]} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <AppIcon name={{ ios: 'bed.double', android: 'hotel', web: 'hotel' }} size={22} />
        </View>
        <View style={styles.cardMain}>
          <Text style={[styles.cardTitle, darkMode && styles.titleDark]}>{reservation.guest}</Text>
          <Text style={[styles.cardSubtitle, darkMode && styles.subtitleDark]}>{reservation.id}</Text>
        </View>
        <StatusBadge status={reservation.status} />
      </View>
      <View style={styles.twoColumn}>
        <InfoBlock label="Total" value={reservation.amount} alignRight />
        <InfoBlock label="Status" value={formatStatus(reservation.status)} />
      </View>
      <InfoRow label="Quarto" value={reservation.room} />
      <InfoRow label="Período" value={`${reservation.checkIn} até ${reservation.checkOut}`} />
      <Text style={styles.detailHint}>Ver detalhes</Text>
    </Pressable>
  );
}

function ClientCard({ client, onPress }: { client: Client; onPress: () => void }) {
  const { darkMode } = useVisual();
  return (
    <Pressable style={[styles.card, darkMode && styles.surfaceDark]} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <AppIcon name={{ ios: 'person', android: 'person', web: 'person' }} size={22} />
        </View>
        <View style={styles.cardMain}>
          <Text style={[styles.cardTitle, darkMode && styles.titleDark]}>{client.name}</Text>
          <Text style={[styles.cardSubtitle, darkMode && styles.subtitleDark]}>ID: {client.id}</Text>
        </View>
        <StatusBadge status={client.status} />
      </View>
      <InfoRow label="E-mail" value={client.email} />
      <InfoRow label="Telefone" value={client.phone} />
      <View style={styles.twoColumn}>
        <InfoBlock label="Estadias" value={String(client.totalStays)} />
        <InfoBlock label="Última visita" value={client.lastStay} alignRight />
      </View>
      <Text style={styles.detailHint}>Ver detalhes</Text>
    </Pressable>
  );
}

function InfoBlock({ label, value, alignRight }: { label: string; value: string; alignRight?: boolean }) {
  const { darkMode } = useVisual();
  return (
    <View style={[styles.infoBlock, alignRight && styles.alignRight]}>
      <Text style={[styles.infoLabel, darkMode && styles.subtitleDark]}>{label}</Text>
      <Text style={[styles.infoValue, darkMode && styles.bodyTextDark]}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { darkMode } = useVisual();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, darkMode && styles.subtitleDark]}>{label}</Text>
      <Text style={[styles.infoRowValue, darkMode && styles.bodyTextDark]}>{value}</Text>
    </View>
  );
}

function DashboardScreen({
  setTab,
  openReservation,
  openDetail,
  bottomInset,
}: {
  setTab: (tab: TabKey) => void;
  openReservation: () => void;
  openDetail: (target: NonNullable<DetailTarget>) => void;
  bottomInset: number;
}) {
  const { checkIns, weeklyOccupation, getDashboardStats } = useHotelData();
  const { darkMode } = useVisual();
  const stats = getDashboardStats();
  const nextCheckIns = useMemo(() => checkIns.filter((item) => item.type === 'Check-in' && item.status !== 'Concluido').slice(0, 4), [checkIns]);
  const maxOccupation = Math.max(...weeklyOccupation.map((item) => item.value));

  return (
    <ScreenScroll bottomInset={bottomInset}>
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroTitle}>Thinkers Hotel</Text>
          <Text style={styles.heroSubtitle}>Olá, Miguel. Acompanhe a operação de hoje.</Text>
        </View>
        <LiquidButton style={styles.heroAction} onPress={openReservation} tintColor="rgba(255, 255, 255, 0.74)">
          <AppIcon name={{ ios: 'plus', android: 'add', web: 'add' }} size={28} color={liquidGlassEnabled ? colors.secondary : '#FFFFFF'} />
        </LiquidButton>
      </View>

      <View style={styles.grid}>
        <Pressable style={[styles.shortcut, darkMode && styles.surfaceDark]} onPress={() => setTab('checkin')}>
          <AppIcon name={{ ios: 'door.left.hand.open', android: 'login', web: 'login' }} size={42} />
          <Text style={styles.shortcutLabel}>Check-in/out</Text>
        </Pressable>
        <Pressable style={[styles.shortcut, darkMode && styles.surfaceDark]} onPress={() => setTab('reservas')}>
          <AppIcon name={{ ios: 'calendar.badge.clock', android: 'calendar_month', web: 'calendar_month' }} size={42} />
          <Text style={styles.shortcutLabel}>Reservas</Text>
        </Pressable>
        <Pressable style={[styles.shortcut, darkMode && styles.surfaceDark]} onPress={() => setTab('clientes')}>
          <AppIcon name={{ ios: 'person.2.fill', android: 'group', web: 'group' }} size={42} />
          <Text style={styles.shortcutLabel}>Clientes</Text>
        </Pressable>
        <Pressable style={[styles.shortcut, darkMode && styles.surfaceDark]} onPress={() => setTab('config')}>
          <AppIcon name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }} size={42} />
          <Text style={styles.shortcutLabel}>Config</Text>
        </Pressable>
      </View>

      <View style={styles.statGrid}>
        <StatCard label="Reservas" value={stats.totalReservations} />
        <StatCard label="Check-ins" value={stats.checkInsHoje} />
        <StatCard label="Check-outs" value={stats.checkOutsHoje} />
        <StatCard label="Ocupados" value={stats.occupiedRooms} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, darkMode && styles.titleDark]}>Ocupação semanal</Text>
        </View>
        <View style={[styles.chart, darkMode && styles.surfaceDark]}>
          {weeklyOccupation.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.chartItem}>
              <AnimatedChartBar height={28 + (item.value / maxOccupation) * 110} color={index === 3 ? colors.secondary : colors.primary} />
              <Text style={[styles.chartLabel, darkMode && styles.subtitleDark]}>{item.name}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, darkMode && styles.titleDark]}>Próximos check-ins</Text>
          <Pressable onPress={() => setTab('checkin')}>
            <Text style={styles.linkText}>Ver todos</Text>
          </Pressable>
        </View>
        {nextCheckIns.length ? nextCheckIns.map((item) => <StayEventCard key={item.id} item={item} compact onPress={() => openDetail({ type: 'stay', id: item.id })} />) : <EmptyState text="Sem check-ins agendados." />}
      </View>
    </ScreenScroll>
  );
}

function ReservationsScreen({
  openReservation,
  openDetail,
  bottomInset,
}: {
  openReservation: () => void;
  openDetail: (target: NonNullable<DetailTarget>) => void;
  bottomInset: number;
}) {
  const [search, setSearch] = useState('');
  const { reservations } = useHotelData();
  const filteredReservations = useMemo(() => {
    const term = normalize(search);
    if (!term) return reservations;
    return reservations.filter((reservation) => normalize(`${reservation.id} ${reservation.guest} ${reservation.room}`).includes(term));
  }, [reservations, search]);

  return (
    <ScreenScroll bottomInset={bottomInset}>
      <Header title="Reservas" subtitle="Gerencie reservas ativas e futuras." actionLabel="Nova" onAction={openReservation} />
      <SearchBox value={search} onChangeText={setSearch} placeholder="Buscar por hóspede, quarto ou ID" />
      {filteredReservations.length ? (
        filteredReservations.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} onPress={() => openDetail({ type: 'reservation', id: reservation.id })} />)
      ) : (
        <EmptyState text="Nenhuma reserva encontrada." />
      )}
    </ScreenScroll>
  );
}

function StayEventCard({ item, compact, onPress }: { item: StayEvent; compact?: boolean; onPress: () => void }) {
  const { performCheckInOrOut } = useHotelData();
  const { darkMode } = useVisual();
  const isDone = item.status === 'Concluido';

  return (
    <Pressable style={[styles.card, compact && styles.compactCard, darkMode && styles.surfaceDark]} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, item.type === 'Check-out' && styles.avatarBlue]}>
          <AppIcon
            name={item.type === 'Check-in' ? { ios: 'arrow.right.to.line', android: 'login', web: 'login' } : { ios: 'arrow.left.to.line', android: 'logout', web: 'logout' }}
            size={22}
          />
        </View>
        <View style={styles.cardMain}>
          <Text style={[styles.cardTitle, darkMode && styles.titleDark]}>{item.guest}</Text>
          <Text style={[styles.cardSubtitle, darkMode && styles.subtitleDark]}>
            {item.type} as {item.time} · quarto {item.room}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      {!compact ? (
        <View style={styles.actionRow}>
          <View style={styles.actionInfo}>
            <InfoRow label="Telefone" value={item.phone} />
          </View>
          <View style={styles.actionButtonRow}>
            <LiquidButton
              disabled={isDone}
              label={isDone ? 'Realizado' : item.type === 'Check-in' ? 'Fazer check-in' : 'Fazer check-out'}
              style={styles.smallButton}
              textStyle={styles.smallButtonText}
              onPress={() =>
                confirmAction(item.type, `Confirmar ${item.type.toLowerCase()} de ${item.guest}?`, async () => {
                  try {
                    await performCheckInOrOut(item.id, 'Concluido');
                    notify(item.type, `${item.type} realizado.`);
                  } catch (requestError) {
                    notify('Check-in/out', requestError instanceof Error ? requestError.message : 'Não foi possível concluir o fluxo.');
                  }
                })
              }
            />
          </View>
        </View>
      ) : null}
      <Text style={styles.detailHint}>Ver detalhes</Text>
    </Pressable>
  );
}

function CheckInScreen({ openDetail, bottomInset }: { openDetail: (target: NonNullable<DetailTarget>) => void; bottomInset: number }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CheckFilter>('all');
  const { checkIns } = useHotelData();
  const filteredData = useMemo(() => {
    const term = normalize(search);
    return checkIns.filter((item) => {
      const matchesFilter = filter === 'all' || (filter === 'in' && item.type === 'Check-in') || (filter === 'out' && item.type === 'Check-out');
      const matchesSearch = !term || normalize(`${item.guest} ${item.room}`).includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [checkIns, filter, search]);

  return (
    <ScreenScroll bottomInset={bottomInset}>
      <Header title="Check-in / Check-out" subtitle="Controle entradas e saídas de hoje." />
      <LiquidSegmentedControl
        value={filter}
        onChange={setFilter}
        options={[
          { label: 'Todos', value: 'all' },
          { label: 'Entradas', value: 'in' },
          { label: 'Saídas', value: 'out' },
        ]}
      />
      <SearchBox value={search} onChangeText={setSearch} placeholder="Buscar por hóspede ou quarto" />
      {filteredData.length ? filteredData.map((item) => <StayEventCard key={item.id} item={item} onPress={() => openDetail({ type: 'stay', id: item.id })} />) : <EmptyState text="Nenhum check-in ou check-out agendado." />}
    </ScreenScroll>
  );
}

function ClientsScreen({
  openClient,
  openDetail,
  bottomInset,
}: {
  openClient: () => void;
  openDetail: (target: NonNullable<DetailTarget>) => void;
  bottomInset: number;
}) {
  const [search, setSearch] = useState('');
  const { clients } = useHotelData();
  const filteredClients = useMemo(() => {
    const term = normalize(search);
    if (!term) return clients;
    return clients.filter((client) => normalize(`${client.id} ${client.name} ${client.email}`).includes(term));
  }, [clients, search]);

  return (
    <ScreenScroll bottomInset={bottomInset}>
      <Header title="Clientes" subtitle="Histórico e dados dos hóspedes." actionLabel="Novo" onAction={openClient} />
      <SearchBox value={search} onChangeText={setSearch} placeholder="Buscar por nome, email ou ID" />
      {filteredClients.length ? filteredClients.map((client) => <ClientCard key={client.id} client={client} onPress={() => openDetail({ type: 'client', id: client.id })} />) : <EmptyState text="Nenhum cliente encontrado." />}
    </ScreenScroll>
  );
}

function LiquidSegmentedControl<T extends string>({ options, value, onChange }: { options: SegmentOption<T>[]; value: T; onChange: (value: T) => void }) {
  const { darkMode } = useVisual();
  const [containerWidth, setContainerWidth] = useState(0);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const translateX = useRef(new Animated.Value(0)).current;
  const itemWidth = containerWidth > 0 ? containerWidth / options.length : 0;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: selectedIndex * itemWidth,
      damping: 18,
      stiffness: 180,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [itemWidth, selectedIndex, translateX]);

  const buttons = options.map((option) => {
    const active = option.value === value;

    return (
      <Pressable key={option.value} style={styles.segmentButton} onPress={() => onChange(option.value)}>
        <Text style={[styles.segmentText, liquidGlassEnabled && styles.segmentTextGlass, active && styles.segmentTextActive, darkMode && !active && styles.titleDark]}>{option.label}</Text>
      </Pressable>
    );
  });

  if (liquidGlassEnabled) {
    return (
      <GlassContainer spacing={8} style={styles.segmentGlassContainer}>
        <GlassView
          glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.22 }}
          colorScheme={darkMode ? 'dark' : 'light'}
          tintColor={darkMode ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.86)'}
          isInteractive
          style={[styles.segmented, styles.segmentedLiquid]}
          onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}>
          {itemWidth > 0 ? (
            <Animated.View style={[styles.segmentIndicatorWrap, { width: itemWidth, transform: [{ translateX }] }]}>
              <GlassView
                glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.22 }}
                colorScheme={darkMode ? 'dark' : 'light'}
                tintColor="rgba(30, 101, 77, 0.72)"
                isInteractive
                style={styles.segmentIndicator}
              />
            </Animated.View>
          ) : null}
          {buttons}
        </GlassView>
      </GlassContainer>
    );
  }

  return <View style={styles.segmented}>{buttons}</View>;
}

function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { darkMode } = useVisual();
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateInput(value);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate || new Date());
  const monthLabel = visibleMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const days = getCalendarDays(visibleMonth);

  useEffect(() => {
    if (selectedDate) setVisibleMonth(selectedDate);
  }, [value]);

  return (
    <View style={styles.dateField}>
      <Pressable onPress={() => setOpen(true)} style={[styles.input, styles.dateButton, darkMode && styles.surfaceDark]}>
        <Text style={[styles.infoLabel, darkMode && styles.subtitleDark]}>{label}</Text>
        <Text style={[styles.dateButtonText, darkMode && styles.titleDark]}>{value || 'Selecionar data'}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.confirmOverlay}>
          <View style={[styles.calendarDialog, darkMode && styles.surfaceDark]}>
            <View style={styles.calendarHeader}>
              <Pressable style={styles.calendarNavButton} onPress={() => setVisibleMonth((current) => addCalendarMonths(current, -1))}>
                <AppIcon name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={18} />
              </Pressable>
              <Text style={[styles.calendarTitle, darkMode && styles.titleDark]}>{monthLabel}</Text>
              <Pressable style={styles.calendarNavButton} onPress={() => setVisibleMonth((current) => addCalendarMonths(current, 1))}>
                <AppIcon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} />
              </Pressable>
            </View>
            <View style={styles.weekdayRow}>
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekdayText}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {days.map((date, index) => {
                const dateValue = date ? toDateInputValue(date) : '';
                const active = dateValue === value;
                return (
                  <Pressable
                    key={dateValue || `empty-${index}`}
                    disabled={!date}
                    style={[styles.calendarDay, active && styles.calendarDayActive]}
                    onPress={() => {
                      if (!date) return;
                      onChange(dateValue);
                      setOpen(false);
                    }}>
                    <Text style={[styles.calendarDayText, active && styles.calendarDayTextActive]}>{date ? date.getDate() : ''}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmCancelButton} onPress={() => setOpen(false)}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.confirmDeleteButton}
                onPress={() => {
                  onChange(toDateInputValue(new Date()));
                  setOpen(false);
                }}>
                <Text style={styles.loginButtonText}>Hoje</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ConfigScreen({
  bottomInset,
  profile,
  darkMode,
  compactMenu,
  reservationNotifications,
  dailyCheckinNotifications,
  notifications,
  users,
  onEditProfile,
  onCreateUser,
  onEditUser,
  onToggleDarkMode,
  onToggleCompactMenu,
  onToggleReservationNotifications,
  onToggleDailyCheckinNotifications,
  onAddNotification,
  onMarkNotificationsRead,
  onClearNotifications,
  onShowLogs,
}: {
  bottomInset: number;
  profile: ProfileData;
  darkMode: boolean;
  compactMenu: boolean;
  reservationNotifications: boolean;
  dailyCheckinNotifications: boolean;
  notifications: AppNotification[];
  users: UserAccount[];
  onEditProfile: () => void;
  onCreateUser: () => void;
  onEditUser: (userId: string) => void;
  onToggleDarkMode: (value: boolean) => void;
  onToggleCompactMenu: (value: boolean) => void;
  onToggleReservationNotifications: (value: boolean) => void;
  onToggleDailyCheckinNotifications: (value: boolean) => void;
  onAddNotification: (notification: Omit<AppNotification, 'id' | 'time' | 'read'>) => void;
  onMarkNotificationsRead: () => void;
  onClearNotifications: () => void;
  onShowLogs: () => void;
}) {
  const unreadCount = notifications.filter((item) => !item.read).length;
  return (
    <ScreenScroll bottomInset={bottomInset}>
      <Header title="Configurações" subtitle="Preferências do perfil e do sistema." actionLabel="Salvar" onAction={() => notify('Configurações', 'Preferências salvas em memória.')} />
      <SettingsCard title="Meu Perfil" subtitle="Dados do gerente, hotel e região operacional.">
        <InfoRow label="Nome" value={profile.name} />
        <InfoRow label="E-mail" value={profile.email} />
        <InfoRow label="Telefone" value={profile.phone} />
        <InfoRow label="Hotel" value={profile.hotelName} />
        <InfoRow label="Região" value={`${profile.region} · ${profile.timezone} · ${profile.currency}`} />
        <LiquidButton label="Editar perfil e região" onPress={onEditProfile} style={styles.fullWidthButton} textStyle={styles.smallButtonText} />
      </SettingsCard>
      <SettingsCard title="Sistema" subtitle="Ferramentas administrativas.">
        <LiquidButton label="Ver logs de atividades" onPress={onShowLogs} style={styles.fullWidthButton} textStyle={styles.smallButtonText} />
      </SettingsCard>
      <SettingsCard title="Usuários" subtitle="Acessos do painel operacional.">
        {users.map((user) => (
          <View key={user.id} style={styles.managementRow}>
            <View style={styles.cardMain}>
              <Text style={[styles.toggleTitle, darkMode && styles.titleDark]}>{user.name}</Text>
              <Text style={[styles.cardSubtitle, darkMode && styles.subtitleDark]}>
                {user.login} · {user.role} · {user.status}
              </Text>
            </View>
            <LiquidButton label="Editar" onPress={() => onEditUser(user.id)} style={styles.inlineActionButton} textStyle={styles.secondaryActionText} />
          </View>
        ))}
        <LiquidButton label="Novo usuário" onPress={onCreateUser} style={styles.fullWidthButton} textStyle={styles.smallButtonText} />
      </SettingsCard>
      <SettingsCard title="Preferências" subtitle="Aparência e comportamento.">
        <ToggleRow title="Modo escuro" subtitle="Alternar tema escuro do painel." value={darkMode} onValueChange={onToggleDarkMode} />
        <ToggleRow title="Menu compacto" subtitle="Reduzir espaço da navegação inferior." value={compactMenu} onValueChange={onToggleCompactMenu} />
      </SettingsCard>
      <SettingsCard title="Notificações" subtitle="Alertas operacionais.">
        <ToggleRow title="Novas reservas" subtitle="Receber alertas para novas reservas." value={reservationNotifications} onValueChange={onToggleReservationNotifications} />
        <ToggleRow title="Check-ins diários" subtitle="Resumo matinal de entradas previstas." value={dailyCheckinNotifications} onValueChange={onToggleDailyCheckinNotifications} />
        <View style={styles.notificationActions}>
          <LiquidButton
            label="Enviar teste"
            onPress={() => onAddNotification({ type: 'sistema', title: 'Teste de notificação', message: 'Central de notificações ativa no app.' })}
            style={styles.secondaryActionButton}
            textStyle={styles.secondaryActionText}
          />
          <LiquidButton label={`Marcar lidas (${unreadCount})`} onPress={onMarkNotificationsRead} style={styles.secondaryActionButton} textStyle={styles.secondaryActionText} />
        </View>
        {notifications.length ? (
          <View style={styles.notificationList}>
            {notifications.map((item) => (
              <View key={item.id} style={[styles.notificationItem, darkMode && styles.notificationItemDark, !item.read && styles.notificationUnread]}>
                <View style={styles.notificationHeader}>
                  <Text style={[styles.notificationTitle, darkMode && styles.titleDark]}>{item.title}</Text>
                  <Text style={[styles.notificationTime, darkMode && styles.subtitleDark]}>{item.time}</Text>
                </View>
                <Text style={[styles.notificationMessage, darkMode && styles.bodyTextDark]}>{item.message}</Text>
              </View>
            ))}
            <Pressable onPress={onClearNotifications}>
              <Text style={styles.dangerLink}>Limpar notificações</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.emptyText}>Nenhuma notificação no momento.</Text>
        )}
      </SettingsCard>
      <SettingsCard title="Segurança" subtitle="Proteção da conta.">
        <Pressable onPress={() => notify('Segurança', 'Fluxo de alteração de senha preparado para integrar com autenticação.')}>
          <Text style={styles.linkText}>Alterar senha de acesso</Text>
        </Pressable>
        <Pressable onPress={() => notify('Segurança', 'Autenticação de dois fatores preparada para integração futura.')}>
          <Text style={styles.dangerLink}>Ativar autenticação de dois fatores</Text>
        </Pressable>
      </SettingsCard>
    </ScreenScroll>
  );
}

function SettingsCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { darkMode } = useVisual();
  return (
    <View style={[styles.card, darkMode && styles.surfaceDark]}>
      <Text style={[styles.sectionTitle, darkMode && styles.titleDark]}>{title}</Text>
      <Text style={[styles.cardSubtitle, darkMode && styles.subtitleDark]}>{subtitle}</Text>
      <View style={styles.settingsBody}>{children}</View>
    </View>
  );
}

function ToggleRow({ title, subtitle, value, onValueChange }: { title: string; subtitle: string; value: boolean; onValueChange: (value: boolean) => void }) {
  const { darkMode } = useVisual();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.cardMain}>
        <Text style={[styles.toggleTitle, darkMode && styles.titleDark]}>{title}</Text>
        <Text style={[styles.cardSubtitle, darkMode && styles.subtitleDark]}>{subtitle}</Text>
      </View>
      <LiquidToggle value={value} onValueChange={onValueChange} />
    </View>
  );
}

function DetailHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  const { darkMode } = useVisual();
  return (
    <View style={styles.detailHeader}>
      <Pressable style={[styles.backButton, darkMode && styles.surfaceDark]} onPress={onBack}>
        <AppIcon name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={22} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={[styles.title, darkMode && styles.titleDark]}>{title}</Text>
        <Text style={[styles.subtitle, darkMode && styles.subtitleDark]}>{subtitle}</Text>
      </View>
    </View>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  const { darkMode } = useVisual();
  return (
    <View style={[styles.card, darkMode && styles.surfaceDark]}>
      <Text style={[styles.sectionTitle, darkMode && styles.titleDark]}>{title}</Text>
      <View style={styles.detailsGrid}>{children}</View>
    </View>
  );
}

function HotelDropdown({ selectedHotel, onSelect }: { selectedHotel: HotelOption; onSelect: (hotel: HotelOption) => void }) {
  const [open, setOpen] = useState(false);
  const { darkMode } = useVisual();

  return (
    <View style={styles.dropdownGroup}>
      <Pressable onPress={() => setOpen((current) => !current)}>
        <LiquidSurface interactive tintColor={darkMode ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.78)'} style={[styles.dropdownButton, darkMode && styles.surfaceDark]}>
          <View style={styles.dropdownTextBlock}>
            <Text style={[styles.infoLabel, darkMode && styles.subtitleDark]}>Hotel</Text>
            <Text style={[styles.dropdownTitle, darkMode && styles.titleDark]}>{selectedHotel.hotelName}</Text>
            <Text style={[styles.cardSubtitle, darkMode && styles.subtitleDark]}>
              {selectedHotel.region} · {selectedHotel.timezone} · {selectedHotel.currency}
            </Text>
          </View>
          <AppIcon name={{ ios: open ? 'chevron.up' : 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={18} color={darkMode ? '#DDEBE4' : colors.secondary} />
        </LiquidSurface>
      </Pressable>

      {open ? (
        <LiquidSurface interactive tintColor={darkMode ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.72)'} style={[styles.dropdownMenu, darkMode && styles.surfaceDark]}>
          {hotelOptions.map((hotel) => {
            const selected = hotel.hotelName === selectedHotel.hotelName;
            return (
              <Pressable
                key={hotel.hotelName}
                style={[styles.dropdownOption, selected && styles.dropdownOptionActive]}
                onPress={() => {
                  onSelect(hotel);
                  setOpen(false);
                }}>
                <Text style={[styles.dropdownOptionTitle, darkMode && styles.titleDark]}>{hotel.hotelName}</Text>
                <Text style={[styles.cardSubtitle, darkMode && styles.subtitleDark]}>
                  {hotel.region} · {hotel.currency}
                </Text>
              </Pressable>
            );
          })}
        </LiquidSurface>
      ) : null}
    </View>
  );
}

function ProfileEditScreen({
  profile,
  bottomInset,
  onSave,
  onBack,
}: {
  profile: ProfileData;
  bottomInset: number;
  onSave: (profile: ProfileData) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(profile);
  const { darkMode } = useVisual();

  function updateField(field: keyof ProfileData, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  const selectedHotel =
    hotelOptions.find((hotel) => hotel.hotelName === draft.hotelName) ||
    hotelOptions.find((hotel) => hotel.region === draft.region) ||
    hotelOptions[0];

  async function save() {
    onSave(draft);
    notify('Perfil', 'Dados do perfil e região atualizados.');
    onBack();
  }

  return (
    <ScreenScroll bottomInset={bottomInset}>
      <DetailHeader title="Editar Perfil" subtitle="Dados do gerente, hotel e região." onBack={onBack} />
      <DetailSection title="Meu Perfil">
        <TextInput style={[styles.input, darkMode && styles.surfaceDark, darkMode && styles.inputTextDark]} value={draft.name} onChangeText={(value) => updateField('name', value)} placeholder="Nome completo" placeholderTextColor={darkMode ? '#94A69C' : colors.muted} />
        <TextInput style={[styles.input, darkMode && styles.surfaceDark, darkMode && styles.inputTextDark]} value={draft.role} onChangeText={(value) => updateField('role', value)} placeholder="Cargo" placeholderTextColor={darkMode ? '#94A69C' : colors.muted} />
        <TextInput style={[styles.input, darkMode && styles.surfaceDark, darkMode && styles.inputTextDark]} value={draft.email} onChangeText={(value) => updateField('email', value)} placeholder="E-mail profissional" placeholderTextColor={darkMode ? '#94A69C' : colors.muted} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={[styles.input, darkMode && styles.surfaceDark, darkMode && styles.inputTextDark]} value={draft.phone} onChangeText={(value) => updateField('phone', value)} placeholder="Telefone" placeholderTextColor={darkMode ? '#94A69C' : colors.muted} keyboardType="phone-pad" />
      </DetailSection>
      <DetailSection title="Hotel e Região">
        <HotelDropdown
          selectedHotel={selectedHotel}
          onSelect={(hotel) =>
            setDraft((current) => ({
              ...current,
              hotelName: hotel.hotelName,
              region: hotel.region,
              timezone: hotel.timezone,
              currency: hotel.currency,
            }))
          }
        />
      </DetailSection>
      <LiquidButton label="Salvar dados" onPress={save} style={styles.fullWidthButton} textStyle={styles.smallButtonText} />
    </ScreenScroll>
  );
}

function ReservationDetailScreen({ id, bottomInset, onBack, onEdit }: { id: string; bottomInset: number; onBack: () => void; onEdit: (reservationId: string) => void }) {
  const { reservations, checkIns, clients, cancelReservation, deleteReservation } = useHotelData();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const reservation = reservations.find((item) => item.id === id);

  if (!reservation) {
    return (
      <ScreenScroll bottomInset={bottomInset}>
        <DetailHeader title="Reserva" subtitle="Registro não encontrado." onBack={onBack} />
        <EmptyState text="Reserva não encontrada." />
      </ScreenScroll>
    );
  }

  const currentReservation = reservation;
  const roomNumber = currentReservation.room.split(' - ')[0];
  const stayEvent = checkIns.find((item) => item.guest === currentReservation.guest && item.room === roomNumber);
  const client = clients.find((item) => item.name === currentReservation.guest);
  const isCanceled = currentReservation.status === 'Cancelada';
  const hasEffectiveCheckIn = currentReservation.status === 'Check-in' || currentReservation.status === 'Check-out' || checkIns.some((item) => item.type === 'Check-in' && item.reservationId === currentReservation.id && item.status === 'Concluido');

  function handleCancelReservation() {
    if (hasEffectiveCheckIn) {
      notify('Reserva', 'Não é possível cancelar reserva com check-in efetivado.');
      return;
    }

    confirmAction('Cancelar reserva', `A reserva ${currentReservation.id} será marcada como cancelada. Esta ação manterá o histórico da reserva.`, async () => {
      try {
        await cancelReservation(currentReservation.id);
        notify('Reserva cancelada', `A reserva ${currentReservation.id} foi cancelada.`);
      } catch (requestError) {
        notify('Reserva', requestError instanceof Error ? requestError.message : 'Não foi possível cancelar a reserva.');
      }
    });
  }

  async function handleDeleteReservation() {
    try {
      await deleteReservation(currentReservation.id);
      setDeleteConfirmOpen(false);
      notify('Reserva deletada', `A reserva ${currentReservation.id} foi removida do sistema.`);
      onBack();
    } catch (requestError) {
      notify('Reserva', requestError instanceof Error ? requestError.message : 'Não foi possível deletar a reserva.');
    }
  }

  return (
    <ScreenScroll bottomInset={bottomInset}>
      <DetailHeader title={`Reserva ${reservation.id}`} subtitle={reservation.guest} onBack={onBack} />
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <AppIcon name={{ ios: 'bed.double.fill', android: 'hotel', web: 'hotel' }} size={24} />
          </View>
          <View style={styles.cardMain}>
            <Text style={styles.cardTitle}>{reservation.room}</Text>
            <Text style={styles.cardSubtitle}>{reservation.checkIn} até {reservation.checkOut}</Text>
          </View>
          <StatusBadge status={reservation.status} />
        </View>
      </View>
      <DetailSection title="Dados da reserva">
        <InfoRow label="Hóspede" value={reservation.guest} />
        <InfoRow label="Quarto" value={reservation.room} />
        <InfoBlock label="Total" value={reservation.amount} />
        <InfoBlock label="Check-in" value={reservation.checkIn} />
        <InfoBlock label="Check-out" value={reservation.checkOut} />
        <InfoBlock label="Status" value={formatStatus(reservation.status)} />
      </DetailSection>
      <DetailSection title="Hóspede">
        <InfoRow label="Cliente" value={client?.name || 'Não vinculado'} />
        <InfoRow label="Telefone" value={client?.phone || '-'} />
        <InfoRow label="E-mail" value={client?.email || '-'} />
        <InfoBlock label="Classificação" value={client ? formatStatus(client.status) : '-'} />
      </DetailSection>
      <DetailSection title="Operação relacionada">
        <InfoBlock label="Fluxo" value={stayEvent?.type || 'Não agendado'} />
        <InfoBlock label="Horário" value={stayEvent?.time || '-'} />
        <InfoBlock label="Status" value={stayEvent ? formatStatus(stayEvent.status) : '-'} />
        <InfoBlock label="Quarto" value={stayEvent?.room || roomNumber} />
      </DetailSection>
      <DetailSection title="Ações da reserva">
        <Text style={styles.actionWarningText}>Cancelar preserva o histórico. Deletar remove a reserva e o fluxo operacional vinculado.</Text>
        <View style={styles.reservationActionRow}>
          <LiquidButton
            label="Editar reserva"
            onPress={() => onEdit(currentReservation.id)}
            style={[styles.reservationActionButton, styles.secondaryActionButton]}
            textStyle={styles.secondaryActionText}
          />
          <LiquidButton
            disabled={isCanceled || hasEffectiveCheckIn}
            label={isCanceled ? 'Reserva cancelada' : hasEffectiveCheckIn ? 'Check-in efetivado' : 'Cancelar reserva'}
            onPress={handleCancelReservation}
            style={[styles.reservationActionButton, styles.warningButton]}
            textStyle={styles.smallButtonText}
          />
          <LiquidButton
            label="Deletar reserva"
            onPress={() =>
              confirmAction(
                'Deletar reserva',
                `Você está prestes a deletar a reserva ${reservation.id}. Um modal adicional será exibido para confirmar a remoção definitiva.`,
                () => setDeleteConfirmOpen(true),
                true
              )
            }
            style={[styles.reservationActionButton, styles.dangerButton]}
            textStyle={styles.smallButtonText}
          />
        </View>
      </DetailSection>
      <Modal visible={deleteConfirmOpen} animationType="fade" transparent onRequestClose={() => setDeleteConfirmOpen(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>Confirmar exclusão</Text>
            <Text style={styles.confirmMessage}>
              Esta ação vai remover definitivamente a reserva {reservation.id} de {reservation.guest}. O check-in/check-out vinculado também será removido.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmCancelButton} onPress={() => setDeleteConfirmOpen(false)}>
                <Text style={styles.secondaryButtonText}>Voltar</Text>
              </Pressable>
              <Pressable style={styles.confirmDeleteButton} onPress={handleDeleteReservation}>
                <Text style={styles.loginButtonText}>Deletar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenScroll>
  );
}

function ClientDetailScreen({ id, bottomInset, onBack, onEdit }: { id: string; bottomInset: number; onBack: () => void; onEdit: (clientId: string) => void }) {
  const { clients, reservations, checkIns, deleteClient } = useHotelData();
  const client = clients.find((item) => item.id === id);

  if (!client) {
    return (
      <ScreenScroll bottomInset={bottomInset}>
        <DetailHeader title="Cliente" subtitle="Registro não encontrado." onBack={onBack} />
        <EmptyState text="Cliente não encontrado." />
      </ScreenScroll>
    );
  }

  const clientReservations = reservations.filter((item) => item.guest === client.name);
  const clientEvents = checkIns.filter((item) => item.guest === client.name);

  function handleDeleteClient() {
    const currentClient = client;
    if (!currentClient) return;

    if (clientReservations.length > 0) {
      notify('Cliente', 'Não é possível excluir cliente com reservas atribuídas.');
      return;
    }

    confirmAction('Excluir cliente', `Excluir definitivamente ${currentClient.name}?`, async () => {
      try {
        await deleteClient(currentClient.id);
        notify('Cliente excluído', `${currentClient.name} foi removido.`);
        onBack();
      } catch (requestError) {
        notify('Cliente', requestError instanceof Error ? requestError.message : 'Não foi possível excluir o cliente.');
      }
    }, true);
  }

  return (
    <ScreenScroll bottomInset={bottomInset}>
      <DetailHeader title={client.name} subtitle={`Cliente ${client.id}`} onBack={onBack} />
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <AppIcon name={{ ios: 'person.fill', android: 'person', web: 'person' }} size={24} />
          </View>
          <View style={styles.cardMain}>
            <Text style={styles.cardTitle}>{client.name}</Text>
            <Text style={styles.cardSubtitle}>{client.email}</Text>
          </View>
          <StatusBadge status={client.status} />
        </View>
      </View>
      <DetailSection title="Contato e histórico">
        <InfoRow label="Telefone" value={client.phone} />
        <InfoRow label="E-mail" value={client.email} />
        <InfoBlock label="Estadias" value={String(client.totalStays)} />
        <InfoBlock label="Última visita" value={client.lastStay} />
        <LiquidButton label="Editar cliente" onPress={() => onEdit(client.id)} style={styles.fullWidthButton} textStyle={styles.smallButtonText} />
        <LiquidButton
          disabled={clientReservations.length > 0}
          label={clientReservations.length > 0 ? 'Cliente com reservas' : 'Excluir cliente'}
          onPress={handleDeleteClient}
          style={[styles.fullWidthButton, styles.dangerButton]}
          textStyle={styles.smallButtonText}
        />
      </DetailSection>
      <DetailSection title="Reservas vinculadas">
        {clientReservations.length ? (
          clientReservations.map((reservation) => <InfoRow key={reservation.id} label={`${reservation.id} · ${formatStatus(reservation.status)}`} value={`${reservation.room} · ${reservation.amount}`} />)
        ) : (
          <Text style={styles.emptyText}>Nenhuma reserva vinculada.</Text>
        )}
      </DetailSection>
      <DetailSection title="Check-in/out">
        {clientEvents.length ? (
          clientEvents.map((event) => <InfoRow key={event.id} label={`${event.type} · ${event.time}`} value={`Quarto ${event.room} · ${formatStatus(event.status)}`} />)
        ) : (
          <Text style={styles.emptyText}>Nenhum evento previsto.</Text>
        )}
      </DetailSection>
    </ScreenScroll>
  );
}

function StayDetailScreen({ id, bottomInset, onBack }: { id: string; bottomInset: number; onBack: () => void }) {
  const { checkIns, reservations, clients, performCheckInOrOut } = useHotelData();
  const event = checkIns.find((item) => item.id === id);

  if (!event) {
    return (
      <ScreenScroll bottomInset={bottomInset}>
        <DetailHeader title="Check-in/out" subtitle="Registro não encontrado." onBack={onBack} />
        <EmptyState text="Evento não encontrado." />
      </ScreenScroll>
    );
  }

  const isDone = event.status === 'Concluido';
  const reservation = reservations.find((item) => item.guest === event.guest && item.room.includes(event.room));
  const client = clients.find((item) => item.name === event.guest);
  const linkedCheckout =
    event.type === 'Check-in' && event.status === 'Concluido'
      ? checkIns.find((item) => item.type === 'Check-out' && item.reservationId && item.reservationId === event.reservationId)
      : null;

  return (
    <ScreenScroll bottomInset={bottomInset}>
      <DetailHeader title={event.type} subtitle={`${event.guest} · quarto ${event.room}`} onBack={onBack} />
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.avatar, event.type === 'Check-out' && styles.avatarBlue]}>
            <AppIcon name={event.type === 'Check-in' ? { ios: 'arrow.right.to.line', android: 'login', web: 'login' } : { ios: 'arrow.left.to.line', android: 'logout', web: 'logout' }} size={24} />
          </View>
          <View style={styles.cardMain}>
            <Text style={styles.cardTitle}>{event.guest}</Text>
            <Text style={styles.cardSubtitle}>{event.type} às {event.time}</Text>
          </View>
          <StatusBadge status={event.status} />
        </View>
        <LiquidButton
          disabled={isDone}
          label={isDone ? 'Fluxo realizado' : event.type === 'Check-in' ? 'Fazer check-in agora' : 'Fazer check-out agora'}
          style={styles.fullWidthButton}
          textStyle={styles.smallButtonText}
          onPress={() =>
            confirmAction(event.type, `Confirmar ${event.type.toLowerCase()} de ${event.guest}?`, async () => {
              try {
                await performCheckInOrOut(event.id, 'Concluido');
                notify(event.type, `${event.type} realizado.`);
              } catch (requestError) {
                notify('Check-in/out', requestError instanceof Error ? requestError.message : 'Não foi possível concluir o fluxo.');
              }
            })
          }
        />
        {linkedCheckout ? (
          <LiquidButton
            disabled={linkedCheckout.status === 'Concluido'}
            label={linkedCheckout.status === 'Concluido' ? 'Check-out realizado' : 'Fazer check-out agora'}
            style={styles.fullWidthButton}
            textStyle={styles.smallButtonText}
            onPress={() =>
              confirmAction('Check-out', `Confirmar check-out de ${linkedCheckout.guest}?`, async () => {
                try {
                  await performCheckInOrOut(linkedCheckout.id, 'Concluido');
                  notify('Check-out', 'Check-out realizado.');
                } catch (requestError) {
                  notify('Check-out', requestError instanceof Error ? requestError.message : 'Não foi possível concluir o check-out.');
                }
              })
            }
          />
        ) : null}
      </View>
      <DetailSection title="Operação">
        <InfoBlock label="ID" value={event.id} />
        <InfoBlock label="Tipo" value={event.type} />
        <InfoBlock label="Horário" value={event.time} />
        <InfoBlock label="Quarto" value={event.room} />
        <InfoRow label="Telefone" value={event.phone} />
        <InfoBlock label="Status" value={formatStatus(event.status)} />
      </DetailSection>
      <DetailSection title="Reserva">
        <InfoBlock label="Reserva" value={reservation?.id || 'Não vinculada'} />
        <InfoRow label="Período" value={reservation ? `${reservation.checkIn} até ${reservation.checkOut}` : '-'} />
        <InfoBlock label="Total" value={reservation?.amount || '-'} />
        <InfoBlock label="Status" value={reservation ? formatStatus(reservation.status) : '-'} />
        {linkedCheckout ? (
          <LiquidButton
            disabled={linkedCheckout.status === 'Concluido'}
            label={linkedCheckout.status === 'Concluido' ? 'Check-out realizado' : 'Fazer check-out'}
            style={styles.fullWidthButton}
            textStyle={styles.smallButtonText}
            onPress={() =>
              confirmAction('Check-out', `Confirmar check-out de ${linkedCheckout.guest}?`, async () => {
                try {
                  await performCheckInOrOut(linkedCheckout.id, 'Concluido');
                  notify('Check-out', 'Check-out realizado.');
                } catch (requestError) {
                  notify('Check-out', requestError instanceof Error ? requestError.message : 'Não foi possível concluir o check-out.');
                }
              })
            }
          />
        ) : null}
      </DetailSection>
      <DetailSection title="Hóspede">
        <InfoRow label="Cliente" value={client?.name || event.guest} />
        <InfoRow label="E-mail" value={client?.email || '-'} />
        <InfoBlock label="Classificação" value={client ? formatStatus(client.status) : '-'} />
        <InfoBlock label="Estadias" value={client ? String(client.totalStays) : '-'} />
      </DetailSection>
    </ScreenScroll>
  );
}

function LogsScreen({ bottomInset, onBack }: { bottomInset: number; onBack: () => void }) {
  const { getLogs } = useHotelData();
  const { darkMode } = useVisual();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const data = await getLogs();
        setLogs(data);
      } catch (err) {
        notify('Logs', 'Não foi possível carregar os logs.');
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [getLogs]);

  return (
    <ScreenScroll bottomInset={bottomInset}>
      <DetailHeader title="Logs do Sistema" subtitle="Histórico de atividades recentes." onBack={onBack} />
      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={[styles.cardSubtitle, darkMode && styles.subtitleDark]}>Carregando logs...</Text>
        </View>
      ) : logs.length === 0 ? (
        <EmptyState text="Nenhum log encontrado." />
      ) : (
        logs.map((log) => (
          <View key={log.id} style={[styles.card, darkMode && styles.surfaceDark]}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <AppIcon name={{ ios: 'list.bullet.rectangle', android: 'list', web: 'list' }} size={24} />
              </View>
              <View style={styles.cardMain}>
                <Text style={[styles.cardTitle, darkMode && styles.titleDark]}>
                  {log.operacao} em {log.tabela}
                </Text>
                <Text style={[styles.cardSubtitle, darkMode && styles.subtitleDark]}>
                  Usuário: {log.usuario_login} · Registro: {log.registro_id}
                </Text>
                <Text style={[styles.cardSubtitle, darkMode && styles.subtitleDark]}>{new Date(log.criado_em).toLocaleString('pt-BR')}</Text>
              </View>
            </View>
            {log.dados_novos && log.dados_novos !== '{}' && (
              <View style={{ marginTop: 12, padding: 12, backgroundColor: darkMode ? '#1A2E25' : '#f0f4f2', borderRadius: 8 }}>
                <Text style={[styles.cardSubtitle, { fontWeight: '600', marginBottom: 4 }, darkMode && styles.subtitleDark]}>Dados:</Text>
                <Text style={[styles.cardSubtitle, { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }, darkMode && styles.subtitleDark]}>
                  {typeof log.dados_novos === 'object' ? JSON.stringify(log.dados_novos, null, 2) : log.dados_novos}
                </Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScreenScroll>
  );
}

function ClientModal({ visible, onClose, client }: { visible: boolean; onClose: () => void; client?: Client | null }) {
  const { addClient, updateClient } = useHotelData();
  const { darkMode } = useVisual();
  const [name, setName] = useState(client?.name || '');
  const [email, setEmail] = useState(client?.email || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [status, setStatus] = useState<ClientStatus>(client?.status || 'Novo');

  useEffect(() => {
    setName(client?.name || '');
    setEmail(client?.email || '');
    setPhone(client?.phone || '');
    setStatus(client?.status || 'Novo');
  }, [client, visible]);

  async function save() {
    if (!name.trim()) {
      notify('Cliente', 'Informe o nome completo.');
      return;
    }
    try {
      if (client) {
        await updateClient(client.id, { name: name.trim(), email: email.trim() || '-', phone: phone.trim() || '-', status });
      } else {
        await addClient({ name: name.trim(), email: email.trim() || '-', phone: phone.trim() || '-', status });
      }
      setName('');
      setEmail('');
      setPhone('');
      setStatus('Novo');
      onClose();
    } catch (requestError) {
      notify('Cliente', requestError instanceof Error ? requestError.message : 'Não foi possível salvar o cliente.');
    }
  }

  return (
    <FormModal visible={visible} title={client ? 'Editar Cliente' : 'Novo Cliente'} onClose={onClose} onSubmit={save} submitLabel="Salvar Cliente">
      <TextInput style={[styles.input, darkMode && styles.surfaceDark, darkMode && styles.inputTextDark]} value={name} onChangeText={setName} placeholder="Nome completo *" placeholderTextColor={darkMode ? '#C1D0CA' : colors.muted} />
      <TextInput style={[styles.input, darkMode && styles.surfaceDark, darkMode && styles.inputTextDark]} value={email} onChangeText={setEmail} placeholder="E-mail" placeholderTextColor={darkMode ? '#C1D0CA' : colors.muted} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={[styles.input, darkMode && styles.surfaceDark, darkMode && styles.inputTextDark]} value={phone} onChangeText={setPhone} placeholder="Telefone / WhatsApp" placeholderTextColor={darkMode ? '#C1D0CA' : colors.muted} keyboardType="phone-pad" />
      <Text style={styles.fieldLabel}>Status do cliente</Text>
      <LiquidSegmentedControl
        value={status}
        onChange={setStatus}
        options={[
          { label: 'Regular', value: 'Regular' },
          { label: 'VIP', value: 'VIP' },
          { label: 'Novo', value: 'Novo' },
        ]}
      />
    </FormModal>
  );
}

function UserModal({
  visible,
  user,
  onClose,
  onSave,
}: {
  visible: boolean;
  user?: UserAccount | null;
  onClose: () => void;
  onSave: (user: { name: string; login: string; role: UserRole; status: UserStatus; password?: string }, userId?: string) => Promise<void>;
}) {
  const { darkMode } = useVisual();
  const [name, setName] = useState(user?.name || '');
  const [login, setLogin] = useState(user?.login || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'Operacional');
  const [status, setStatus] = useState<UserStatus>(user?.status || 'Ativo');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setName(user?.name || '');
    setLogin(user?.login || '');
    setRole(user?.role || 'Operacional');
    setStatus(user?.status || 'Ativo');
    setPassword('');
  }, [user, visible]);

  async function save() {
    if (!name.trim() || !login.trim()) {
      notify('Usuário', 'Informe nome e login.');
      return;
    }
    if (!user && !password.trim()) {
      notify('Usuário', 'Informe uma senha para o novo usuário.');
      return;
    }
    try {
      await onSave({ name: name.trim(), login: login.trim(), role, status, password: password.trim() || undefined }, user?.id);
      onClose();
    } catch (requestError) {
      notify('Usuário', requestError instanceof Error ? requestError.message : 'Não foi possível salvar o usuário.');
    }
  }

  return (
    <FormModal visible={visible} title={user ? 'Editar Usuário' : 'Novo Usuário'} onClose={onClose} onSubmit={save} submitLabel="Salvar">
      <TextInput style={[styles.input, darkMode && styles.surfaceDark, darkMode && styles.inputTextDark]} value={name} onChangeText={setName} placeholder="Nome completo *" placeholderTextColor={darkMode ? '#C1D0CA' : colors.muted} />
      <TextInput style={[styles.input, darkMode && styles.surfaceDark, darkMode && styles.inputTextDark]} value={login} onChangeText={setLogin} placeholder="Login *" placeholderTextColor={darkMode ? '#C1D0CA' : colors.muted} autoCapitalize="none" />
      <TextInput style={[styles.input, darkMode && styles.surfaceDark, darkMode && styles.inputTextDark]} value={password} onChangeText={setPassword} placeholder={user ? 'Nova senha (opcional)' : 'Senha *'} placeholderTextColor={darkMode ? '#C1D0CA' : colors.muted} secureTextEntry />
      <Text style={styles.fieldLabel}>Perfil</Text>
      <LiquidSegmentedControl
        value={role}
        onChange={setRole}
        options={[
          { label: 'Admin', value: 'Administrador' },
          { label: 'Gerente', value: 'Gerente' },
          { label: 'Operacao', value: 'Operacional' },
        ]}
      />
      <Text style={styles.fieldLabel}>Status</Text>
      <LiquidSegmentedControl
        value={status}
        onChange={setStatus}
        options={[
          { label: 'Ativo', value: 'Ativo' },
          { label: 'Bloqueado', value: 'Bloqueado' },
        ]}
      />
    </FormModal>
  );
}

function ReservationModal({ visible, onClose, onCreated, reservation }: { visible: boolean; onClose: () => void; onCreated?: (guest: string) => void; reservation?: Reservation | null }) {
  const { clients, addReservation, updateReservation, calculateReservationTotal } = useHotelData();
  const { darkMode } = useVisual();
  const [guest, setGuest] = useState(reservation?.guest || '');
  const [checkIn, setCheckIn] = useState(reservation?.rawCheckIn || '');
  const [checkOut, setCheckOut] = useState(reservation?.rawCheckOut || '');
  const [roomType, setRoomType] = useState<RoomType>((reservation?.room.split(' - ')[1] as RoomType | undefined) || 'Standard');
  const [roomNumber, setRoomNumber] = useState(reservation?.room.split(' - ')[0] || '');

  useEffect(() => {
    setGuest(reservation?.guest || '');
    setCheckIn(reservation?.rawCheckIn || '');
    setCheckOut(reservation?.rawCheckOut || '');
    setRoomType((reservation?.room.split(' - ')[1] as RoomType | undefined) || 'Standard');
    setRoomNumber(reservation?.room.split(' - ')[0] || '');
  }, [reservation, visible]);

  const selectedClient = clients.find((client) => client.name === guest);
  const { days, total } = calculateReservationTotal(checkIn, checkOut, roomType);
  const filteredClients = useMemo(() => {
    const term = normalize(guest);
    if (!term || selectedClient) return clients.slice(0, 5);
    return clients.filter((client) => normalize(client.name).includes(term)).slice(0, 5);
  }, [clients, guest, selectedClient]);

  async function save() {
    if (!selectedClient) {
      notify('Reserva', 'Selecione um hóspede cadastrado.');
      return;
    }
    if (!checkIn || !checkOut || days <= 0) {
      notify('Reserva', 'Informe um período válido no formato AAAA-MM-DD.');
      return;
    }
    if (!roomNumber.trim()) {
      notify('Reserva', 'Informe o número do quarto.');
      return;
    }
    try {
      if (reservation) {
        await updateReservation(reservation.id, { guest: selectedClient.name, roomNumber: roomNumber.trim(), roomType, checkIn, checkOut });
      } else {
        await addReservation({ guest: selectedClient.name, roomNumber: roomNumber.trim(), roomType, checkIn, checkOut });
        onCreated?.(selectedClient.name);
      }
      setGuest('');
      setCheckIn('');
      setCheckOut('');
      setRoomType('Standard');
      setRoomNumber('');
      onClose();
    } catch (requestError) {
      notify('Reserva', requestError instanceof Error ? requestError.message : 'Não foi possível salvar a reserva.');
    }
  }

  return (
    <FormModal visible={visible} title={reservation ? 'Editar Reserva' : 'Nova Reserva'} onClose={onClose} onSubmit={save} submitLabel={reservation ? 'Salvar Reserva' : 'Confirmar Reserva'}>
      <TextInput style={[styles.input, darkMode && styles.surfaceDark, darkMode && styles.inputTextDark]} value={guest} onChangeText={setGuest} placeholder="Buscar cliente cadastrado *" placeholderTextColor={darkMode ? '#A7B8AF' : '#52645B'} />
      <View style={styles.suggestionList}>
        {filteredClients.map((client) => (
          <Pressable key={client.id} style={[styles.suggestion, guest === client.name && styles.suggestionActive]} onPress={() => setGuest(client.name)}>
            <Text style={styles.suggestionTitle}>{client.name}</Text>
            <Text style={styles.cardSubtitle}>{client.email}</Text>
          </Pressable>
        ))}
      </View>
      <DatePickerField label="Check-in" value={checkIn} onChange={setCheckIn} />
      <DatePickerField label="Check-out" value={checkOut} onChange={setCheckOut} />
      <Text style={styles.fieldLabel}>Tipo de quarto</Text>
      <View style={styles.roomTypeList}>
        {roomTypes.map((option) => (
          <Pressable key={option} style={[styles.roomTypeButton, roomType === option && styles.roomTypeActive]} onPress={() => setRoomType(option)}>
            <Text style={[styles.roomTypeText, roomType === option && styles.roomTypeTextActive]}>{option}</Text>
            <Text style={[styles.cardSubtitle, roomType === option && styles.roomTypeTextActive]}>R$ {ROOM_RATES[option]},00/dia</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={[styles.input, darkMode && styles.surfaceDark, darkMode && styles.inputTextDark]} value={roomNumber} onChangeText={setRoomNumber} placeholder="Número do quarto *" placeholderTextColor={darkMode ? '#A7B8AF' : '#52645B'} keyboardType="number-pad" />
      {days > 0 ? (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Resumo do valor</Text>
          <Text style={styles.summaryText}>
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para {days} {days === 1 ? 'diaria' : 'diarias'}.
          </Text>
        </View>
      ) : null}
    </FormModal>
  );
}

function FormModal({
  visible,
  title,
  children,
  submitLabel,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  children: ReactNode;
  submitLabel: string;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
}) {
  const { darkMode } = useVisual();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={[styles.modalContent, darkMode && styles.surfaceDark]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, darkMode && styles.titleDark]}>{title}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.formBody}>{children}</ScrollView>
          <View style={styles.modalFooter}>
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
            <LiquidButton label={submitLabel} onPress={onSubmit} style={styles.primaryButton} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const { login, isLoading } = useHotelData();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  async function submit() {
    if (!username.trim() || !password) {
      setLoginError('Informe usuário e senha.');
      return;
    }

    try {
      await login(username.trim(), password);
      setLoginError('');
      onLogin();
    } catch (requestError) {
      setLoginError(requestError instanceof Error ? requestError.message : 'Usuário ou senha inválidos.');
    }
  }

  return (
    <SafeAreaView style={styles.loginRoot}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginKeyboard}>
        <Animated.View style={[styles.loginPanel, { opacity, transform: [{ scale }] }]}>
          <View style={styles.loginBrand}>
            <View style={styles.loginIcon}>
              <AppIcon name={{ ios: 'building.2', android: 'apartment', web: 'apartment' }} size={34} />
            </View>
            <Text style={styles.loginTitle}>Thinkers Hotel</Text>
            <Text style={styles.loginSubtitle}>Acesse o painel operacional mobile.</Text>
          </View>

          <View style={styles.loginForm}>
            <View style={styles.inputWithIcon}>
              <AppIcon name={{ ios: 'person', android: 'person', web: 'person' }} size={20} color={colors.muted} />
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Usuário"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                style={styles.inputInline}
              />
            </View>
            <View style={styles.inputWithIcon}>
              <AppIcon name={{ ios: 'lock', android: 'lock', web: 'lock' }} size={20} color={colors.muted} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Senha"
                placeholderTextColor={colors.muted}
                secureTextEntry
                style={styles.inputInline}
                onSubmitEditing={submit}
              />
            </View>
            {loginError ? <Text style={styles.loginError}>{loginError}</Text> : null}
            <LiquidButton label={isLoading ? 'Entrando...' : 'Entrar'} disabled={isLoading} onPress={submit} style={styles.loginButton} textStyle={styles.loginButtonText} tintColor="rgba(30, 101, 77, 0.32)" />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function BottomNav({
  activeTab,
  detailTarget,
  compactMenu,
  darkMode,
  navBottom,
  onTabPress,
}: {
  activeTab: TabKey;
  detailTarget: DetailTarget;
  compactMenu: boolean;
  darkMode: boolean;
  navBottom: number;
  onTabPress: (tab: TabKey) => void;
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.key === activeTab));
  const translateX = useRef(new Animated.Value(0)).current;
  const tabBarHorizontalPadding = 6;
  const itemWidth = containerWidth > 0 ? (containerWidth - tabBarHorizontalPadding * 2) / tabs.length : 0;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: activeIndex * itemWidth,
      damping: 18,
      stiffness: 170,
      mass: 0.75,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, itemWidth, translateX]);

  const content = tabs.map((tab) => (
    <Pressable key={tab.key} style={[styles.tabItem, compactMenu && styles.tabItemCompact, activeTab === tab.key && !detailTarget && !liquidGlassEnabled && styles.tabItemActive]} onPress={() => onTabPress(tab.key)}>
      <AppIcon name={tab.icon} size={23} color={activeTab === tab.key && !detailTarget ? colors.secondary : colors.muted} />
      {!compactMenu ? (
        <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]} numberOfLines={1}>
          {tab.label}
        </Text>
      ) : null}
    </Pressable>
  ));

  if (liquidGlassEnabled) {
    return (
      <GlassContainer style={[styles.tabGlassContainer, { bottom: navBottom }]} spacing={8}>
        <GlassView
          glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.22 }}
          colorScheme={darkMode ? 'dark' : 'light'}
          tintColor={darkMode ? 'rgba(255, 255, 255, 0.34)' : 'rgba(255, 255, 255, 0.88)'}
          isInteractive
          style={[styles.tabBar, styles.tabBarLiquid, compactMenu && styles.tabBarCompact, darkMode && !liquidGlassEnabled && styles.tabBarDark]}
          onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}>
          {itemWidth > 0 && !detailTarget ? (
            <Animated.View style={[styles.tabIndicatorWrap, { width: itemWidth, transform: [{ translateX }] }]}>
              <GlassView
                glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.22 }}
                colorScheme={darkMode ? 'dark' : 'light'}
                tintColor="transparent"
                isInteractive
                style={styles.tabIndicator}
              />
            </Animated.View>
          ) : null}
          {content}
        </GlassView>
      </GlassContainer>
    );
  }

  return <View style={[styles.tabBar, compactMenu && styles.tabBarCompact, darkMode && styles.tabBarDark, { bottom: navBottom }]}>{content}</View>;
}

function NativeTabsShell({
  profile,
  darkMode,
  compactMenu,
  reservationNotifications,
  dailyCheckinNotifications,
  notifications,
  users,
  bottomInset,
  openReservation,
  openClient,
  openDetail,
  openUser,
  editUser,
  setDarkMode,
  setCompactMenu,
  setReservationNotifications,
  setDailyCheckinNotifications,
  addNotification,
  markNotificationsRead,
  clearNotifications,
}: {
  profile: ProfileData;
  darkMode: boolean;
  compactMenu: boolean;
  reservationNotifications: boolean;
  dailyCheckinNotifications: boolean;
  notifications: AppNotification[];
  users: UserAccount[];
  bottomInset: number;
  openReservation: () => void;
  openClient: () => void;
  openDetail: (target: NonNullable<DetailTarget>) => void;
  openUser: () => void;
  editUser: (userId: string) => void;
  setDarkMode: (value: boolean) => void;
  setCompactMenu: (value: boolean) => void;
  setReservationNotifications: (value: boolean) => void;
  setDailyCheckinNotifications: (value: boolean) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'time' | 'read'>) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
}) {
  return (
    <NativeTab.Navigator
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelVisibilityMode: compactMenu ? 'unlabeled' : 'labeled',
        tabBarBlurEffect: darkMode ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight',
        tabBarControllerMode: 'tabBar',
        tabBarMinimizeBehavior: 'none',
        tabBarStyle: {
          backgroundColor: darkMode ? 'rgba(16, 35, 27, 0.72)' : 'rgba(255, 255, 255, 0.82)',
          shadowColor: 'rgba(0,0,0,0.16)',
        },
        overrideScrollViewContentInsetAdjustmentBehavior: true,
      }}>
      <NativeTab.Screen
        name="dashboard"
        options={{
          title: 'Inicio',
          tabBarLabel: 'Inicio',
          tabBarIcon: Platform.OS === 'ios' ? { type: 'sfSymbol', name: 'chart.bar' } : undefined,
        }}>
        {({ navigation }) => <DashboardScreen setTab={(tab) => navigation.navigate(tab)} openReservation={openReservation} openDetail={openDetail} bottomInset={bottomInset} />}
      </NativeTab.Screen>
      <NativeTab.Screen
        name="reservas"
        options={{
          title: 'Reservas',
          tabBarLabel: 'Reservas',
          tabBarIcon: Platform.OS === 'ios' ? { type: 'sfSymbol', name: 'calendar.badge.clock' } : undefined,
        }}>
        {() => <ReservationsScreen openReservation={openReservation} openDetail={openDetail} bottomInset={bottomInset} />}
      </NativeTab.Screen>
      <NativeTab.Screen
        name="checkin"
        options={{
          title: 'Check-in',
          tabBarLabel: 'Check-in',
          tabBarIcon: Platform.OS === 'ios' ? { type: 'sfSymbol', name: 'door.left.hand.open' } : undefined,
        }}>
        {() => <CheckInScreen openDetail={openDetail} bottomInset={bottomInset} />}
      </NativeTab.Screen>
      <NativeTab.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          tabBarLabel: 'Clientes',
          tabBarIcon: Platform.OS === 'ios' ? { type: 'sfSymbol', name: 'person.2' } : undefined,
        }}>
        {() => <ClientsScreen openClient={openClient} openDetail={openDetail} bottomInset={bottomInset} />}
      </NativeTab.Screen>
      <NativeTab.Screen
        name="config"
        options={{
          title: 'Config',
          tabBarLabel: 'Config',
          tabBarIcon: Platform.OS === 'ios' ? { type: 'sfSymbol', name: 'gearshape' } : undefined,
        }}>
        {() => (
          <ConfigScreen
            bottomInset={bottomInset}
            profile={profile}
            darkMode={darkMode}
            compactMenu={compactMenu}
            reservationNotifications={reservationNotifications}
            dailyCheckinNotifications={dailyCheckinNotifications}
            notifications={notifications}
            users={users}
            onEditProfile={() => openDetail({ type: 'profile' })}
            onCreateUser={openUser}
            onEditUser={editUser}
            onToggleDarkMode={setDarkMode}
            onToggleCompactMenu={setCompactMenu}
            onToggleReservationNotifications={setReservationNotifications}
            onToggleDailyCheckinNotifications={(value) => {
              setDailyCheckinNotifications(value);
              if (value) {
                addNotification({ type: 'checkin', title: 'Resumo diário ativado', message: 'Você receberá lembretes de check-ins diários.' });
              }
            }}
            onAddNotification={addNotification}
            onMarkNotificationsRead={markNotificationsRead}
            onClearNotifications={clearNotifications}
            onShowLogs={() => openDetail({ type: 'logs' })}
          />
        )}
      </NativeTab.Screen>
    </NativeTab.Navigator>
  );
}

export default function HomeScreen() {
  const { clients, reservations, users, addUser, updateUser } = useHotelData();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [detailTarget, setDetailTarget] = useState<DetailTarget>(null);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData>({
    name: 'Miguel Balbo',
    role: 'Gerente Geral',
    email: 'miguel@thinkershotel.com',
    phone: '(11) 99999-0000',
    hotelName: 'Thinkers Hotel',
    region: 'São Paulo, Brasil',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
  });
  const [darkMode, setDarkMode] = useState(false);
  const [compactMenu, setCompactMenu] = useState(false);
  const [reservationNotifications, setReservationNotifications] = useState(true);
  const [dailyCheckinNotifications, setDailyCheckinNotifications] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'NOT001',
      type: 'checkin',
      title: 'Check-ins de hoje',
      message: 'Existem entradas previstas para acompanhar no painel.',
      time: 'Agora',
      read: false,
    },
  ]);
  const insets = useSafeAreaInsets();
  const useNativeTabs = Platform.OS === 'android';
  const navBottom = Math.max(12, insets.bottom + (compactMenu ? 8 : 10));
  const contentBottomInset = useNativeTabs ? insets.bottom + 20 : navBottom + (compactMenu ? 58 : 76);

  function goToTab(tab: TabKey) {
    setDetailTarget(null);
    setActiveTab(tab);
  }

  const backSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Boolean(detailTarget) && gestureState.moveX < 80 && gestureState.dx > 18 && Math.abs(gestureState.dy) < 30,
        onPanResponderRelease: (_, gestureState) => {
          if (detailTarget && gestureState.dx > 72) {
            setDetailTarget(null);
          }
        },
      }),
    [detailTarget]
  );

  function addNotification(notification: Omit<AppNotification, 'id' | 'time' | 'read'>) {
    void sendSystemNotification(notification.title, notification.message);
    setNotifications((current) => [
      {
        ...notification,
        id: `NOT${String(current.length + 1).padStart(3, '0')}`,
        time: 'Agora',
        read: false,
      },
      ...current,
    ]);
  }

  function openReservationModal() {
    setEditingReservationId(null);
    setReservationModalOpen(true);
  }

  function openReservationEdit(reservationId: string) {
    setEditingReservationId(reservationId);
    setReservationModalOpen(true);
  }

  function openClientCreate() {
    setEditingClientId(null);
    setClientModalOpen(true);
  }

  function openClientEdit(clientId: string) {
    setEditingClientId(clientId);
    setClientModalOpen(true);
  }

  function openUserCreate() {
    setEditingUserId(null);
    setUserModalOpen(true);
  }

  function openUserEdit(userId: string) {
    setEditingUserId(userId);
    setUserModalOpen(true);
  }

  async function saveUser(user: { name: string; login: string; role: UserRole; status: UserStatus; password?: string }, userId?: string) {
    if (userId) {
      await updateUser(userId, user);
      notify('Usuário', 'Usuário atualizado na API.');
      return;
    }
    await addUser(user);
    notify('Usuário', 'Usuário criado na API.');
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  const editingReservation = editingReservationId ? reservations.find((reservation) => reservation.id === editingReservationId) : null;
  const editingClient = editingClientId ? clients.find((client) => client.id === editingClientId) : null;
  const editingUser = editingUserId ? users.find((user) => user.id === editingUserId) : null;

  return (
    <VisualContext.Provider value={{ darkMode }}>
    <SafeAreaView style={[styles.root, darkMode && styles.rootDark]} edges={['top', 'left', 'right']}>
      <View style={[styles.appBody, darkMode && styles.appBodyDark]} {...backSwipeResponder.panHandlers}>
        {detailTarget?.type === 'reservation' ? <ReservationDetailScreen id={detailTarget.id} bottomInset={contentBottomInset} onBack={() => setDetailTarget(null)} onEdit={openReservationEdit} /> : null}
        {detailTarget?.type === 'client' ? <ClientDetailScreen id={detailTarget.id} bottomInset={contentBottomInset} onBack={() => setDetailTarget(null)} onEdit={openClientEdit} /> : null}
        {detailTarget?.type === 'stay' ? <StayDetailScreen id={detailTarget.id} bottomInset={contentBottomInset} onBack={() => setDetailTarget(null)} /> : null}
        {detailTarget?.type === 'profile' ? <ProfileEditScreen profile={profile} bottomInset={contentBottomInset} onSave={setProfile} onBack={() => setDetailTarget(null)} /> : null}
        {detailTarget?.type === 'logs' ? <LogsScreen bottomInset={contentBottomInset} onBack={() => setDetailTarget(null)} /> : null}
        {!detailTarget && useNativeTabs ? (
          <NativeTabsShell
            profile={profile}
            darkMode={darkMode}
            compactMenu={compactMenu}
            reservationNotifications={reservationNotifications}
            dailyCheckinNotifications={dailyCheckinNotifications}
            notifications={notifications}
            users={users}
            bottomInset={contentBottomInset}
            openReservation={openReservationModal}
            openClient={openClientCreate}
            openDetail={setDetailTarget}
            openUser={openUserCreate}
            editUser={openUserEdit}
            setDarkMode={setDarkMode}
            setCompactMenu={setCompactMenu}
            setReservationNotifications={setReservationNotifications}
            setDailyCheckinNotifications={setDailyCheckinNotifications}
            addNotification={addNotification}
            markNotificationsRead={() => setNotifications((current) => current.map((item) => ({ ...item, read: true })))}
            clearNotifications={() => setNotifications([])}
          />
        ) : null}
        {!detailTarget && !useNativeTabs && activeTab === 'dashboard' ? (
          <DashboardScreen setTab={goToTab} openReservation={openReservationModal} openDetail={setDetailTarget} bottomInset={contentBottomInset} />
        ) : null}
        {!detailTarget && !useNativeTabs && activeTab === 'reservas' ? (
          <ReservationsScreen openReservation={openReservationModal} openDetail={setDetailTarget} bottomInset={contentBottomInset} />
        ) : null}
        {!detailTarget && !useNativeTabs && activeTab === 'checkin' ? <CheckInScreen openDetail={setDetailTarget} bottomInset={contentBottomInset} /> : null}
        {!detailTarget && !useNativeTabs && activeTab === 'clientes' ? <ClientsScreen openClient={openClientCreate} openDetail={setDetailTarget} bottomInset={contentBottomInset} /> : null}
        {!detailTarget && !useNativeTabs && activeTab === 'config' ? (
          <ConfigScreen
            bottomInset={contentBottomInset}
            profile={profile}
            darkMode={darkMode}
            compactMenu={compactMenu}
            reservationNotifications={reservationNotifications}
            dailyCheckinNotifications={dailyCheckinNotifications}
            notifications={notifications}
            users={users}
            onEditProfile={() => setDetailTarget({ type: 'profile' })}
            onCreateUser={openUserCreate}
            onEditUser={openUserEdit}
            onToggleDarkMode={setDarkMode}
            onToggleCompactMenu={setCompactMenu}
            onToggleReservationNotifications={setReservationNotifications}
            onToggleDailyCheckinNotifications={(value) => {
              setDailyCheckinNotifications(value);
              if (value) {
                addNotification({ type: 'checkin', title: 'Resumo diário ativado', message: 'Você receberá lembretes de check-ins diários.' });
              }
            }}
            onAddNotification={addNotification}
            onMarkNotificationsRead={() => setNotifications((current) => current.map((item) => ({ ...item, read: true })))}
            onClearNotifications={() => setNotifications([])}
            onShowLogs={() => setDetailTarget({ type: 'logs' })}
          />
        ) : null}
      </View>
      {!useNativeTabs ? <BottomNav activeTab={activeTab} detailTarget={detailTarget} compactMenu={compactMenu} darkMode={darkMode} navBottom={navBottom} onTabPress={goToTab} /> : null}
      <ReservationModal
        visible={reservationModalOpen}
        reservation={editingReservation}
        onClose={() => {
          setReservationModalOpen(false);
          setEditingReservationId(null);
        }}
        onCreated={(guest) => {
          if (reservationNotifications) {
            addNotification({ type: 'reserva', title: 'Reserva confirmada', message: `Nova reserva registrada para ${guest}.` });
          }
        }}
      />
      <ClientModal
        visible={clientModalOpen}
        client={editingClient}
        onClose={() => {
          setClientModalOpen(false);
          setEditingClientId(null);
        }}
      />
      <UserModal
        visible={userModalOpen}
        user={editingUser}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUserId(null);
        }}
        onSave={saveUser}
      />
    </SafeAreaView>
    </VisualContext.Provider>
  );
}

const colors = {
  background: '#F7FAF8',
  surface: '#FFFFFF',
  card: '#E7F6EC',
  primary: '#64C985',
  secondary: '#124C3A',
  blue: '#D8E8FF',
  text: '#102D24',
  muted: '#4F6358',
  border: '#D8E5DC',
  danger: '#B42318',
  warning: '#8A5A00',
};

const styles = StyleSheet.create({
  loginRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loginKeyboard: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  loginPanel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    gap: 22,
  },
  loginBrand: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  loginIcon: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: {
    color: colors.secondary,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '500',
  },
  loginSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  loginForm: {
    gap: 12,
  },
  inputWithIcon: {
    minHeight: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  inputInline: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '300',
  },
  loginError: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '400',
  },
  loginButton: {
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  liquidButtonSurface: {
    overflow: 'hidden',
  },
  liquidIOSSurface: {
    backgroundColor: 'rgba(30, 101, 77, 0.62)',
    borderColor: 'rgba(126, 217, 155, 0.78)',
    borderRadius: 999,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  liquidPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  liquidButtonText: {
    color: '#FFFFFF',
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  rootDark: {
    backgroundColor: '#0B1110',
  },
  darkScreen: {
    backgroundColor: '#0B1110',
  },
  surfaceDark: {
    backgroundColor: '#17211F',
    borderColor: '#334541',
  },
  titleDark: {
    color: '#F4FBF8',
  },
  subtitleDark: {
    color: '#C1D0CA',
  },
  bodyTextDark: {
    color: '#E2EEE9',
  },
  inputTextDark: {
    color: '#F0F8F5',
  },
  appBody: {
    flex: 1,
  },
  appBodyDark: {
    backgroundColor: '#0B1110',
  },
  screenContent: {
    padding: 20,
    paddingBottom: 112,
    gap: 16,
  },
  hero: {
    minHeight: 168,
    borderRadius: 8,
    backgroundColor: colors.primary,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 38,
    color: colors.secondary,
    fontWeight: '500',
  },
  heroSubtitle: {
    marginTop: 10,
    color: colors.secondary,
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 230,
  },
  heroAction: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.secondary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '500',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#9BAEA4',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    flex: 1,
  },
  secondaryButtonText: {
    color: colors.secondary,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shortcut: {
    width: '48%',
    aspectRatio: 1.08,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    justifyContent: 'space-between',
  },
  shortcutLabel: {
    color: colors.secondary,
    fontWeight: '500',
    fontSize: 16,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  statValue: {
    color: colors.secondary,
    fontSize: 32,
    fontWeight: '600',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.secondary,
    fontSize: 19,
    fontWeight: '600',
  },
  chart: {
    height: 178,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartItem: {
    alignItems: 'center',
    gap: 8,
  },
  chartBar: {
    width: 24,
    borderRadius: 8,
  },
  chartLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  searchBox: {
    minHeight: 50,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  compactCard: {
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBlue: {
    backgroundColor: colors.blue,
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: colors.secondary,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    flexShrink: 1,
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    flexShrink: 1,
  },
  twoColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  infoBlock: {
    flex: 1,
    minWidth: 128,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 3,
    lineHeight: 20,
    flexShrink: 1,
  },
  infoRow: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  infoRowValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    marginTop: 4,
  },
  dateLine: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '400',
  },
  contactLine: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgePositive: {
    backgroundColor: colors.card,
  },
  badgeWarning: {
    backgroundColor: '#FFF5D9',
  },
  badgeDanger: {
    backgroundColor: '#FFE2E2',
  },
  badgeNeutral: {
    backgroundColor: '#EEF1EF',
  },
  badgeText: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontWeight: '400',
    textAlign: 'center',
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 12,
  },
  actionInfo: {
    width: '100%',
  },
  actionButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionWarningText: {
    width: '100%',
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  reservationActionRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reservationActionButton: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  warningButton: {
    backgroundColor: colors.warning,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  smallButton: {
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#6B7B74',
    borderColor: '#6B7B74',
    opacity: 0.78,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentButtonActive: {
    backgroundColor: colors.secondary,
  },
  segmentGlassSurface: {
    minHeight: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.52)',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
  },
  segmentGlassSurfaceActive: {
    borderColor: 'rgba(126, 217, 155, 0.88)',
    backgroundColor: 'rgba(30, 101, 77, 0.68)',
  },
  segmentGlassContainer: {
    borderRadius: 999,
  },
  segmentIndicatorWrap: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    paddingHorizontal: 2,
  },
  segmentIndicator: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(126, 217, 155, 0.86)',
    backgroundColor: 'rgba(30, 101, 77, 0.62)',
  },
  segmentedLiquid: {
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    borderColor: 'rgba(255, 255, 255, 0.72)',
    overflow: 'hidden',
  },
  segmentText: {
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 13,
  },
  segmentTextGlass: {
    color: colors.secondary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  settingsBody: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  managementRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    padding: 12,
  },
  inlineActionButton: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  dateField: {
    width: '100%',
  },
  dateButton: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
  },
  dateButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 4,
  },
  togglePressable: {
    borderRadius: 999,
  },
  switchGlassShell: {
    minWidth: 56,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.62)',
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  liquidToggleTrackDark: {
    borderColor: 'rgba(255, 255, 255, 0.38)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  toggleTitle: {
    color: colors.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  linkText: {
    color: '#0B5F45',
    fontWeight: '800',
  },
  dangerLink: {
    color: colors.danger,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(30, 101, 77, 0.36)',
  },
  modalContent: {
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  modalHeader: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.secondary,
    fontSize: 23,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.secondary,
    fontSize: 28,
    lineHeight: 32,
  },
  formBody: {
    padding: 20,
    gap: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 56, 45, 0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 14,
  },
  calendarDialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  calendarHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  calendarNavButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.secondary,
    fontSize: 17,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calendarDayActive: {
    backgroundColor: colors.secondary,
  },
  calendarDayText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  calendarDayTextActive: {
    color: '#FFFFFF',
  },
  confirmTitle: {
    color: colors.secondary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },
  confirmMessage: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  suggestionList: {
    gap: 8,
  },
  suggestion: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.surface,
  },
  suggestionActive: {
    borderColor: colors.secondary,
    backgroundColor: colors.card,
  },
  suggestionTitle: {
    color: colors.secondary,
    fontWeight: '600',
  },
  roomTypeList: {
    gap: 8,
  },
  roomTypeButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.background,
  },
  roomTypeActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  roomTypeText: {
    color: colors.secondary,
    fontWeight: '600',
  },
  roomTypeTextActive: {
    color: '#FFFFFF',
  },
  summary: {
    borderRadius: 8,
    backgroundColor: '#E5F4EA',
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 14,
  },
  summaryTitle: {
    color: colors.secondary,
    fontWeight: '600',
  },
  summaryText: {
    color: colors.text,
    marginTop: 4,
    lineHeight: 20,
  },
  tabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    minHeight: 72,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabGlassContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  tabBarLiquid: {
    position: 'relative',
    left: 0,
    right: 0,
    borderRadius: 999,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  tabIndicatorWrap: {
    position: 'absolute',
    left: 6,
    top: 6,
    bottom: 6,
    paddingHorizontal: 2,
  },
  tabIndicator: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  tabBarDark: {
    backgroundColor: '#17211F',
    borderColor: '#40524E',
  },
  tabBarCompact: {
    minHeight: 54,
  },
  tabItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabItemCompact: {
    minHeight: 44,
  },
  tabItemActive: {
    backgroundColor: colors.card,
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.secondary,
  },
  fallbackIcon: {
    fontWeight: '600',
    lineHeight: 24,
  },
  detailHint: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  fullWidthButton: {
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  notificationActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryActionButton: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#9BAEA4',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  secondaryActionText: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  notificationList: {
    gap: 10,
  },
  notificationItem: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 12,
    gap: 6,
  },
  notificationItemDark: {
    borderColor: '#40524E',
    backgroundColor: '#17211F',
  },
  notificationUnread: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  notificationTitle: {
    flex: 1,
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  notificationTime: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '400',
  },
  notificationMessage: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  dropdownGroup: {
    width: '100%',
    gap: 10,
  },
  dropdownButton: {
    minHeight: 62,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  dropdownTitle: {
    color: colors.secondary,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  dropdownMenu: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.58)',
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    padding: 8,
    gap: 4,
  },
  dropdownOption: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(126, 217, 155, 0.24)',
  },
  dropdownOptionTitle: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
