"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Hotel,
  MessageCircle,
  Plus,
  Users,
} from "lucide-react";

import { TenantBreadcrumb } from "@/components/tenant/tenant-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type ReservationStatus =
  | "Canceled"
  | "Checked in"
  | "Checked out"
  | "Confirmed"
  | "Pending";

type Reservation = {
  adults: number;
  checkIn: string;
  checkOut: string;
  children: number;
  createdAt: Date | string;
  deposit: string;
  email: string;
  guest: string;
  id: string;
  nights: number;
  notes: string;
  paymentMethod: string;
  phone: string;
  room: string;
  roomCode: string;
  roomId: string;
  roomType: string;
  status: ReservationStatus;
  total: string;
  updatedAt: Date | string;
};

type ReservationRecord = {
  adults: number;
  checkIn: Date | string;
  checkOut: Date | string;
  children: number;
  createdAt: Date | string;
  deposit: string;
  guestEmail: string;
  guestName: string;
  guestPhone: string;
  id: string;
  nights: number;
  notes: string;
  paymentMethod: string;
  roomCode: string;
  roomId: string;
  roomName: string;
  roomType: string;
  status: ReservationStatus;
  totalAmount: string;
  updatedAt: Date | string;
};

const STATUS_STYLES: Record<ReservationStatus, string> = {
  "Checked in": "border-black bg-black text-white",
  "Checked out": "border-zinc-200 bg-zinc-50 text-zinc-700",
  Canceled: "border-red-200 bg-red-50 text-red-700",
  Confirmed: "border-zinc-300 bg-zinc-100 text-zinc-900",
  Pending: "border-zinc-400 bg-white text-zinc-900",
};

const STATUS_LEGEND: Array<{
  dotClassName: string;
  label: ReservationStatus;
}> = [
  { label: "Checked in", dotClassName: "bg-black" },
  { label: "Confirmed", dotClassName: "bg-zinc-600" },
  { label: "Pending", dotClassName: "bg-zinc-300 ring-1 ring-zinc-500" },
  { label: "Checked out", dotClassName: "bg-zinc-500" },
  { label: "Canceled", dotClassName: "bg-red-500" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ReservationCalendarView() {
  const trpc = useTRPC();
  const todayKey = toDateKey(new Date());
  const [viewDate, setViewDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [roomFilter, setRoomFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const reservationsQuery = useQuery({
    ...trpc.tenant.reservations.list.queryOptions(),
    retry: false,
  });
  const roomsQuery = useQuery({
    ...trpc.tenant.rooms.list.queryOptions(),
    retry: false,
  });
  const reservations = useMemo(
    () =>
      (reservationsQuery.data ?? []).map((reservation) =>
        toReservation(reservation as ReservationRecord),
      ),
    [reservationsQuery.data],
  );
  const filteredReservations = useMemo(
    () =>
      roomFilter === "all"
        ? reservations
        : reservations.filter((reservation) => reservation.roomId === roomFilter),
    [reservations, roomFilter],
  );
  const monthDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const selectedReservations = filteredReservations.filter((reservation) =>
    isDateWithinStay(selectedDate, reservation),
  );
  const metrics = useMemo(
    () => getMetrics(filteredReservations, roomsQuery.data?.length ?? 0, todayKey),
    [filteredReservations, roomsQuery.data?.length, todayKey],
  );

  function selectDate(dateKey: string, reservationsForDay: Reservation[]) {
    setSelectedDate(dateKey);
    setSheetOpen(reservationsForDay.length > 0);
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <div className="flex h-[calc(100vh-6.75rem)] min-h-[720px] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TenantBreadcrumb />
          <div className="flex items-center gap-3">
            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger className="h-8 w-44 rounded-lg bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rooms</SelectItem>
                {(roomsQuery.data ?? []).map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.code} - {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="xs" asChild>
              <Link href="/tenant/reservations/new">
                <Plus className="size-4" />
                New booking
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<CalendarDays className="size-4" />}
            label="Arrivals"
            loading={reservationsQuery.isPending}
            value={String(metrics.arrivals)}
          />
          <MetricCard
            icon={<DoorOpen className="size-4" />}
            label="Departures"
            loading={reservationsQuery.isPending}
            value={String(metrics.departures)}
          />
          <MetricCard
            icon={<Hotel className="size-4" />}
            label="Occupancy"
            loading={reservationsQuery.isPending || roomsQuery.isPending}
            value={`${metrics.occupancy}%`}
          />
          <MetricCard
            icon={<Users className="size-4" />}
            label="In-house"
            loading={reservationsQuery.isPending}
            value={String(metrics.inHouse)}
          />
        </div>

        <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-xl border-zinc-200 bg-white p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <div>
              <h1 className="text-lg font-bold text-[#303030]">{monthLabel}</h1>
              <p className="text-xs font-medium text-zinc-500">
                Click booked dates to inspect reservations.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                {STATUS_LEGEND.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600"
                  >
                    <span
                      className={cn("size-2 rounded-full", item.dotClassName)}
                    />
                    {item.label}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setViewDate(addMonths(viewDate, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelectedDate(todayKey);
                  setSheetOpen(
                    filteredReservations.some((reservation) =>
                      isDateWithinStay(todayKey, reservation),
                    ),
                  );
                }}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setViewDate(addMonths(viewDate, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-500"
              >
                {day}
              </div>
            ))}
          </div>

          {reservationsQuery.isPending ? (
            <CalendarSkeleton />
          ) : reservationsQuery.isError ? (
            <CalendarMessage message={reservationsQuery.error.message} />
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-7 overflow-hidden">
              {monthDays.map((date) => {
                const dateKey = toDateKey(date);
                const dayReservations = filteredReservations.filter((reservation) =>
                  isDateWithinStay(dateKey, reservation),
                );
                const muted = date.getMonth() !== viewDate.getMonth();
                const selected = selectedDate === dateKey;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={cn(
                      "min-h-0 border-b border-r border-zinc-200 p-2 text-left transition hover:bg-zinc-50",
                      muted && "bg-zinc-50/60 text-zinc-400",
                      selected && "bg-zinc-100 ring-2 ring-inset ring-zinc-900",
                      dayReservations.length && "cursor-pointer",
                    )}
                    onClick={() => selectDate(dateKey, dayReservations)}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold">{date.getDate()}</span>
                      {dayReservations.length ? (
                        <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {dayReservations.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      {dayReservations.slice(0, 4).map((reservation) => (
                        <div
                          key={reservation.id}
                          className={cn(
                            "truncate rounded-md border px-2 py-1 text-[11px] font-semibold",
                            STATUS_STYLES[reservation.status],
                          )}
                        >
                          {reservation.roomCode} - {reservation.guest}
                        </div>
                      ))}
                      {dayReservations.length > 4 ? (
                        <p className="px-1 text-[11px] font-semibold text-zinc-500">
                          +{dayReservations.length - 4} more
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-zinc-200 p-5">
          <SheetTitle className="text-xl font-bold">Bookings</SheetTitle>
          <p className="text-sm font-medium text-zinc-500">
            {formatFullDate(selectedDate)}
          </p>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 p-5">
            {selectedReservations.map((reservation) => (
              <BookingCard key={reservation.id} reservation={reservation} />
            ))}
            {selectedReservations.length ? (
              <BookingTimeline reservation={selectedReservations[0]} />
            ) : null}
          </div>
        </div>

        <SheetFooter className="border-t border-zinc-200 p-4">
          <Button asChild>
            <Link href="/tenant/reservations/new">Create booking</Link>
          </Button>
          <Button variant="outline" onClick={() => setSheetOpen(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function BookingCard({ reservation }: { reservation: Reservation }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="outline" className={STATUS_STYLES[reservation.status]}>
            {reservation.status}
          </Badge>
          <h3 className="mt-3 text-lg font-bold text-zinc-950">
            {reservation.id}
          </h3>
          <p className="mt-1 text-sm font-medium text-zinc-500">
            {reservation.guest}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">
          <Hotel className="size-4" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-y border-zinc-200 py-4 text-sm">
        <Detail label="Payment" value={reservation.paymentMethod || "--"} />
        <Detail label="Request type" value="Overnight stay" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Detail label="Room" value={`${reservation.roomCode} - ${reservation.room}`} />
        <Detail label="Nights" value={String(reservation.nights)} />
        <Detail label="Check-in" value={formatFullDate(reservation.checkIn)} />
        <Detail label="Check-out" value={formatFullDate(reservation.checkOut)} />
      </div>

      <div className="mt-5 rounded-lg border border-zinc-300 bg-zinc-50 p-3">
        <p className="text-xs font-bold uppercase text-zinc-700">Confirmed stay</p>
        <p className="mt-1 text-sm font-semibold text-zinc-950">
          {reservation.roomType} · {reservation.adults} adult
          {reservation.adults === 1 ? "" : "s"}, {reservation.children} child
          {reservation.children === 1 ? "" : "ren"}
        </p>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <Detail label="Email" value={reservation.email || "--"} />
        <Detail label="Contact" value={reservation.phone || "--"} />
        <Detail label="Notes" value={reservation.notes || "--"} />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-4 text-sm">
        <span className="font-medium text-zinc-500">Total</span>
        <span className="font-bold text-zinc-950">
          {formatPeso(reservation.total)}
        </span>
      </div>
    </div>
  );
}

function BookingTimeline({ reservation }: { reservation: Reservation }) {
  const events = [
    {
      actor: "System",
      body: `Booking created for ${reservation.roomCode}.`,
      meta: formatDateTime(reservation.createdAt),
      tag: "Created",
    },
    {
      actor: "Front desk",
      body: `Current booking status is ${reservation.status}.`,
      meta: formatDateTime(reservation.updatedAt),
      tag: reservation.status,
    },
  ];

  return (
    <div className="border-t border-zinc-200 pt-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-zinc-950">Activity</p>
          <p className="text-xs font-medium text-zinc-500">
            Source trail and booking changes.
          </p>
        </div>
        <MessageCircle className="size-4 text-zinc-500" />
      </div>
      <div className="mt-4 space-y-4">
        {events.map((event, index) => (
          <div key={event.body} className="relative flex gap-3">
            {index < events.length - 1 ? (
              <span className="absolute left-2 top-5 h-[calc(100%+0.25rem)] w-px bg-zinc-200" />
            ) : null}
            <span className="relative z-10 mt-1 size-4 rounded-full border border-zinc-300 bg-white" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-xs font-bold text-zinc-900">
                  {event.actor}
                </p>
                <span className="shrink-0 text-xs font-medium text-zinc-500">
                  {event.meta}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-zinc-700">
                {event.body}
              </p>
              <span className="mt-2 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-600">
                {event.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-zinc-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  loading,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  loading?: boolean;
  value: string;
}) {
  return (
    <Card className="rounded-xl border-zinc-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-zinc-500">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-14" />
          ) : (
            <p className="text-xl font-bold text-zinc-950">{value}</p>
          )}
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function CalendarSkeleton() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-7 overflow-hidden">
      {Array.from({ length: 42 }).map((_, index) => (
        <div key={index} className="border-b border-r border-zinc-200 p-2">
          <Skeleton className="mb-3 h-4 w-7" />
          <div className="space-y-1">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarMessage({ message }: { message: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-8">
      <p className="text-sm font-semibold text-zinc-600">{message}</p>
    </div>
  );
}

function getCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function toReservation(reservation: ReservationRecord): Reservation {
  return {
    adults: reservation.adults,
    checkIn: toDateKeyFromValue(reservation.checkIn),
    checkOut: toDateKeyFromValue(reservation.checkOut),
    children: reservation.children,
    createdAt: reservation.createdAt,
    deposit: reservation.deposit,
    email: reservation.guestEmail,
    guest: reservation.guestName,
    id: reservation.id,
    nights: reservation.nights,
    notes: reservation.notes,
    paymentMethod: reservation.paymentMethod,
    phone: reservation.guestPhone,
    room: reservation.roomName,
    roomCode: reservation.roomCode,
    roomId: reservation.roomId,
    roomType: reservation.roomType,
    status: reservation.status,
    total: reservation.totalAmount,
    updatedAt: reservation.updatedAt,
  };
}

function getMetrics(
  reservations: Reservation[],
  roomCount: number,
  dateKey: string,
) {
  const activeReservations = reservations.filter(
    (reservation) => reservation.status !== "Canceled",
  );
  const inHouseReservations = activeReservations.filter((reservation) =>
    isDateWithinStay(dateKey, reservation),
  );
  const occupiedRooms = new Set(
    inHouseReservations.map((reservation) => reservation.roomId),
  ).size;

  return {
    arrivals: activeReservations.filter((reservation) => reservation.checkIn === dateKey)
      .length,
    departures: activeReservations.filter(
      (reservation) => reservation.checkOut === dateKey,
    ).length,
    inHouse: inHouseReservations.reduce(
      (total, reservation) => total + reservation.adults + reservation.children,
      0,
    ),
    occupancy: roomCount ? Math.round((occupiedRooms / roomCount) * 100) : 0,
  };
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateKeyFromValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return toDateKey(date);
}

function isDateWithinStay(dateKey: string, reservation: Reservation) {
  return dateKey >= reservation.checkIn && dateKey < reservation.checkOut;
}

function formatFullDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("en-PH", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}

function formatPeso(value: string) {
  const amount = Number(value.replace(/[^\d.]/g, ""));

  if (!Number.isFinite(amount)) return value || "--";

  return `\u20b1${amount.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  })}`;
}
