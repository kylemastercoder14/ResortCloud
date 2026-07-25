"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BedDouble,
  CheckCircle2,
  Clock3,
  DoorClosed,
  DoorOpen,
  Loader2,
  MessageSquareText,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Send,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { TenantBreadcrumb } from "@/components/tenant/tenant-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type ReceptionStatus = "Arriving" | "In-house" | "Checking out" | "Completed";
type ReceptionPriority = "Normal" | "Attention";

type ReceptionGuest = {
  balance: number;
  guestPhone: string;
  guest: string;
  id: string;
  note: string;
  pax: string;
  priority: ReceptionPriority;
  room: string;
  source: string;
  status: ReceptionStatus;
  time: string;
};

type ReceptionRequest = {
  createdAt: Date | string;
  department: string;
  id: string;
  note: string;
  priority: "Normal" | "Urgent";
  roomOrArea: string;
  status: string;
};

type ReceptionShiftNote = {
  createdAt: Date | string;
  id: string;
  note: string;
  title: string;
};

type ReceptionRoom = {
  baseRate: string;
  childrenOccupancy: number;
  code: string;
  id: string;
  maxAdults: number;
  name: string;
  status: string;
  type: string;
};

type ReceptionDepartment = {
  id: string;
  name: string;
  status: string;
};

const STATUS_ORDER: ReceptionStatus[] = [
  "Arriving",
  "In-house",
  "Checking out",
  "Completed",
];

const STATUS_STYLES: Record<ReceptionStatus, string> = {
  Arriving: "border-black bg-black text-white",
  "In-house": "border-zinc-300 bg-white text-zinc-900",
  "Checking out": "border-zinc-200 bg-zinc-100 text-zinc-950",
  Completed: "border-zinc-200 bg-zinc-50 text-zinc-500",
};

const PRIORITY_STYLES: Record<ReceptionPriority, string> = {
  Normal: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Attention: "border-black bg-black text-white",
};

const currency = new Intl.NumberFormat("en-PH", {
  currency: "PHP",
  maximumFractionDigits: 0,
  style: "currency",
});

function getDefaultDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return {
    checkIn: toDateInput(today),
    checkOut: toDateInput(tomorrow),
  };
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getNights(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const nights = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);

  return Number.isFinite(nights) ? nights : 0;
}

function parseMoney(value: string) {
  const amount = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

export function ReceptionView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const reception = useQuery({
    ...trpc.tenant.reception.list.queryOptions(),
    retry: false,
  });
  const rooms = useQuery({
    ...trpc.tenant.rooms.list.queryOptions(),
    retry: false,
  });
  const departments = useQuery({
    ...trpc.tenant.departments.list.queryOptions(),
    retry: false,
  });
  const createWalkIn = useMutation(
    trpc.tenant.reservations.create.mutationOptions({
      onSuccess: async (booking) => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.tenant.reception.list.queryFilter()),
          queryClient.invalidateQueries(trpc.tenant.reservations.list.queryFilter()),
          queryClient.invalidateQueries(trpc.tenant.rooms.list.queryFilter()),
          queryClient.invalidateQueries(trpc.tenant.invoices.list.queryFilter()),
        ]);
        setWalkInOpen(false);

        if (booking.emailNotificationSent) {
          toast.success("Walk-in saved. Confirmation email sent.");
        } else if (booking.emailNotificationError) {
          toast.warning(`Walk-in saved, but email failed: ${booking.emailNotificationError}`);
        } else {
          toast.success("Walk-in saved.");
        }
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const updateStatus = useMutation(
    trpc.tenant.reception.updateReservationStatus.mutationOptions({
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries(trpc.tenant.reception.list.queryFilter());
        toast.success(
          variables.status === "Completed"
            ? "Check-out completed."
            : variables.status === "Checking out"
              ? "Check-out started."
              : "Guest checked in.",
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const createRequest = useMutation(
    trpc.tenant.reception.createRequest.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.tenant.reception.list.queryFilter());
        toast.success("Request sent.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const createShiftNote = useMutation(
    trpc.tenant.reception.createShiftNote.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.tenant.reception.list.queryFilter());
        toast.success("Shift note saved.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const resolveRequest = useMutation(
    trpc.tenant.reception.resolveRequest.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.tenant.reception.list.queryFilter());
        toast.success("Request resolved.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const guests = useMemo(
    () => (reception.data?.guests ?? []) as ReceptionGuest[],
    [reception.data?.guests],
  );
  const requests = useMemo(
    () => (reception.data?.requests ?? []) as ReceptionRequest[],
    [reception.data?.requests],
  );
  const shiftNotes = useMemo(
    () => (reception.data?.shiftNotes ?? []) as ReceptionShiftNote[],
    [reception.data?.shiftNotes],
  );

  const filteredGuests = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return guests;
    }

    return guests.filter((guest) =>
      [guest.guest, guest.room, guest.id, guest.source, guest.note]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [guests, search]);

  const kpiItems = useMemo<KpiGridItem[]>(
    () => [
      {
        title: "Arrivals",
        value: String(guests.filter((guest) => guest.status === "Arriving").length),
        note: "Expected today",
        icon: <DoorOpen className="size-4" />,
      },
      {
        title: "In-house",
        value: String(guests.filter((guest) => guest.status === "In-house").length),
        note: "Currently checked in",
        icon: <Users className="size-4" />,
      },
      {
        title: "Check-outs",
        value: String(
          guests.filter((guest) => guest.status === "Checking out").length,
        ),
        note: "Due today",
        icon: <DoorClosed className="size-4" />,
      },
      {
        title: "Needs attention",
        value: String(
          guests.filter((guest) => guest.priority === "Attention").length,
        ),
        note: "Balance, ID, or request",
        icon: <MessageSquareText className="size-4" />,
      },
    ],
    [guests],
  );

  function handleUpdateStatus(id: string, status: ReceptionStatus) {
    if (status === "Arriving") {
      return;
    }

    updateStatus.mutate({
      id,
      status,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TenantBreadcrumb />
        <Button size="xs" onClick={() => setWalkInOpen(true)} type="button">
          <Plus className="size-4" />
          New walk-in
        </Button>
      </div>

      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={kpiItems} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <Card className="gap-0! h-fit overflow-hidden rounded-xl border-zinc-200 bg-white p-0!">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
            <div>
              <h1 className="text-base font-bold text-zinc-950">
                Front desk queue
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Handle arrivals, in-house requests, and check-outs.
              </p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                className="h-9 rounded-lg pl-9"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search guest, room, or note"
                value={search}
              />
            </div>
          </div>

          <div className="grid min-h-160 divide-y divide-zinc-200 xl:grid-cols-3 xl:divide-x xl:divide-y-0">
            {STATUS_ORDER.filter((status) => status !== "Completed").map(
              (status) => (
                <ReceptionColumn
                  guests={filteredGuests.filter((guest) => guest.status === status)}
                  key={status}
                  status={status}
                  updatingId={
                    updateStatus.isPending ? (updateStatus.variables?.id ?? "") : ""
                  }
                  onUpdateStatus={handleUpdateStatus}
                />
              ),
            )}
          </div>
        </Card>

        <aside className="space-y-5">
          <GuestLookupCard guests={guests} />
          <RequestHandoffCard
            departments={(departments.data ?? []) as ReceptionDepartment[]}
            guests={guests}
            isPending={createRequest.isPending}
            requests={requests}
            resolvingId={resolveRequest.variables?.id ?? ""}
            onCreate={(input) => createRequest.mutateAsync(input)}
            onResolve={(id) => resolveRequest.mutate({ id })}
          />
          <ShiftNotesCard
            isPending={createShiftNote.isPending}
            notes={shiftNotes}
            onCreate={(input) => createShiftNote.mutateAsync(input)}
          />
        </aside>
      </div>

      <NewWalkInDialog
        isPending={createWalkIn.isPending}
        open={walkInOpen}
        rooms={(rooms.data ?? []) as ReceptionRoom[]}
        roomsLoading={rooms.isPending}
        onOpenChange={setWalkInOpen}
        onSave={(input) => createWalkIn.mutate(input)}
      />
    </div>
  );
}

function ReceptionColumn({
  guests,
  onUpdateStatus,
  status,
  updatingId,
}: {
  guests: ReceptionGuest[];
  onUpdateStatus: (id: string, status: ReceptionStatus) => void;
  status: ReceptionStatus;
  updatingId: string;
}) {
  return (
    <section className="bg-zinc-50/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={cn("rounded-md", STATUS_STYLES[status])} variant="outline">
            {status}
          </Badge>
          <span className="text-xs font-bold text-zinc-500">{guests.length}</span>
        </div>
      </div>

      <div className="space-y-3">
        {guests.map((guest) => (
          <GuestQueueCard
            guest={guest}
            key={guest.id}
            isUpdating={updatingId === guest.id}
            onUpdateStatus={onUpdateStatus}
          />
        ))}

        {guests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center">
            <CheckCircle2 className="mx-auto size-6 text-zinc-500" />
            <p className="mt-3 text-sm font-bold text-zinc-950">Queue clear</p>
            <p className="mt-1 text-xs text-zinc-500">
              No guests in this lane.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function GuestQueueCard({
  guest,
  isUpdating,
  onUpdateStatus,
}: {
  guest: ReceptionGuest;
  isUpdating: boolean;
  onUpdateStatus: (id: string, status: ReceptionStatus) => void;
}) {
  function contactGuest() {
    if (!guest.guestPhone) {
      toast.error("No phone number on this guest.");
      return;
    }

    window.open(`tel:${guest.guestPhone.replace(/[^\d+]/g, "")}`, "_self");
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-bold text-zinc-950">{guest.guest}</h2>
            <Badge
              className={cn("rounded-md", PRIORITY_STYLES[guest.priority])}
              variant="outline"
            >
              {guest.priority}
            </Badge>
          </div>
          <p className="mt-1 text-xs font-semibold text-zinc-500">
            {guest.id} • {guest.source}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-xs" type="button" variant="ghost">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              disabled={isUpdating}
              onClick={() => onUpdateStatus(guest.id, "In-house")}
            >
              <UserRoundCheck className="size-4" />
              Mark checked in
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isUpdating}
              onClick={() => onUpdateStatus(guest.id, "Checking out")}
            >
              <DoorClosed className="size-4" />
              Start check-out
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isUpdating}
              onClick={() => onUpdateStatus(guest.id, "Completed")}
            >
              <CheckCircle2 className="size-4" />
              Complete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Detail label="Room" value={guest.room} />
        <Detail label="Time" value={guest.time} />
        <Detail label="Guests" value={guest.pax} />
        <Detail
          label="Balance"
          value={guest.balance > 0 ? currency.format(guest.balance) : "--"}
        />
      </div>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm font-medium text-zinc-700">
        {guest.note}
      </div>

      <div className="mt-4 flex gap-2">
        {guest.status === "Arriving" ? (
          <Button
            className="flex-1"
            disabled={isUpdating}
            onClick={() => onUpdateStatus(guest.id, "In-house")}
            size="xs"
            type="button"
          >
            <UserRoundCheck className="size-4" />
            Check in
          </Button>
        ) : null}
        {guest.status === "Checking out" ? (
          <Button
            className="flex-1"
            disabled={isUpdating}
            onClick={() => onUpdateStatus(guest.id, "Completed")}
            size="xs"
            type="button"
          >
            <CheckCircle2 className="size-4" />
            Complete
          </Button>
        ) : null}
        <Button
          className="flex-1"
          onClick={contactGuest}
          size="xs"
          type="button"
          variant="outline"
        >
          <Phone className="size-4" />
          Contact
        </Button>
      </div>
    </div>
  );
}

function GuestLookupCard({ guests }: { guests: ReceptionGuest[] }) {
  const [query, setQuery] = useState("");
  const lookupGuests = useMemo(() => {
    const term = query.trim().toLowerCase();
    const source = term
      ? guests.filter((guest) =>
          [guest.guest, guest.room, guest.status, guest.note, guest.pax]
            .join(" ")
            .toLowerCase()
            .includes(term),
        )
      : [...guests].sort((a, b) =>
          a.priority === b.priority ? 0 : a.priority === "Attention" ? -1 : 1,
        );

    return source.slice(0, 5);
  }, [guests, query]);

  function contactGuest(guest: ReceptionGuest) {
    if (!guest.guestPhone) {
      toast.error("No phone number on this guest.");
      return;
    }

    window.open(`tel:${guest.guestPhone.replace(/[^\d+]/g, "")}`, "_self");
  }

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
          <Search className="size-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-950">Guest lookup</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Quick search for front desk handoff.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Search</Label>
        <Input
          className="rounded-lg"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Guest name, room code, status, or note"
          value={query}
        />
      </div>

      <div className="space-y-3">
        {lookupGuests.map((guest) => (
          <div
            className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 p-3"
            key={guest.id}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-bold text-zinc-950">
                  {guest.guest}
                </p>
                <Badge
                  className={cn("rounded-md", STATUS_STYLES[guest.status])}
                  variant="outline"
                >
                  {guest.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs font-medium text-zinc-500">
                {guest.room} • {guest.note}
              </p>
            </div>
            <Button
              onClick={() => contactGuest(guest)}
              size="icon-xs"
              type="button"
              variant="outline"
            >
              <Phone className="size-4" />
            </Button>
          </div>
        ))}
        {lookupGuests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
            No matching guest found.
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function NewWalkInDialog({
  isPending,
  onOpenChange,
  onSave,
  open,
  rooms,
  roomsLoading,
}: {
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    adults: number;
    checkIn: string;
    checkOut: string;
    children: number;
    deposit?: string;
    guestEmail?: string;
    guestName: string;
    guestPhone?: string;
    notes?: string;
    paymentMethod?: string;
    rate: string;
    roomId: string;
    status: "Checked in";
    totalAmount: string;
  }) => void;
  open: boolean;
  rooms: ReceptionRoom[];
  roomsLoading: boolean;
}) {
  const defaultDates = getDefaultDates();
  const [values, setValues] = useState({
    adults: 1,
    checkIn: defaultDates.checkIn,
    checkOut: defaultDates.checkOut,
    children: 0,
    deposit: "",
    email: "",
    guestName: "",
    notes: "",
    paymentMethod: "Cash",
    phone: "",
    rate: "",
    roomId: "",
  });
  const availableRooms = rooms.filter(
    (room) => room.status !== "Out of Service" && room.status !== "Occupied",
  );
  const selectedRoom = availableRooms.find((room) => room.id === values.roomId);
  const nights = getNights(values.checkIn, values.checkOut);
  const rateAmount = parseMoney(values.rate || selectedRoom?.baseRate || "0");
  const roomTotal = Math.max(rateAmount * nights, 0);
  const exceedsCapacity =
    selectedRoom &&
    (values.adults > selectedRoom.maxAdults ||
      values.children > selectedRoom.childrenOccupancy);
  const canSubmit =
    Boolean(values.guestName.trim() && values.roomId) &&
    nights > 0 &&
    !exceedsCapacity &&
    !isPending;

  function updateValue<Key extends keyof typeof values>(
    key: Key,
    value: (typeof values)[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function selectRoom(roomId: string) {
    const room = availableRooms.find((item) => item.id === roomId);

    setValues((current) => ({
      ...current,
      rate: room?.baseRate ?? current.rate,
      roomId,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!values.guestName.trim()) {
      toast.error("Guest name is required.");
      return;
    }

    if (!values.roomId) {
      toast.error("Room is required.");
      return;
    }

    if (nights < 1) {
      toast.error("Check-out must be after check-in.");
      return;
    }

    if (exceedsCapacity) {
      toast.error("Guest count exceeds room capacity.");
      return;
    }

    onSave({
      adults: values.adults,
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      children: values.children,
      deposit: values.deposit,
      guestEmail: values.email,
      guestName: values.guestName.trim(),
      guestPhone: values.phone,
      notes: values.notes,
      paymentMethod: values.paymentMethod,
      rate: String(rateAmount),
      roomId: values.roomId,
      status: "Checked in",
      totalAmount: String(roomTotal),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 max-w-lg!" side="right">
        <SheetHeader className="border-b border-zinc-200 px-6 py-5">
          <SheetTitle>New walk-in</SheetTitle>
          <SheetDescription>
            Create same-day booking and check guest in.
          </SheetDescription>
        </SheetHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Guest name</Label>
              <Input
                className="rounded-lg"
                onChange={(event) => updateValue("guestName", event.target.value)}
                placeholder="Full name"
                value={values.guestName}
              />
            </div>
            <div className="space-y-2">
              <Label>Email (optional)</Label>
              <Input
                className="rounded-lg"
                onChange={(event) => updateValue("email", event.target.value)}
                placeholder="guest@email.com"
                type="email"
                value={values.email}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone (optional)</Label>
              <Input
                className="rounded-lg"
                onChange={(event) => updateValue("phone", event.target.value)}
                placeholder="0912 345 6789"
                value={values.phone}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Room</Label>
              <Select value={values.roomId} onValueChange={selectRoom}>
                <SelectTrigger className="h-10 w-full rounded-lg">
                  <SelectValue placeholder={roomsLoading ? "Loading rooms..." : "Select room"} />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.code} - {room.name} ({room.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Check-in</Label>
              <Input
                className="rounded-lg"
                onChange={(event) => updateValue("checkIn", event.target.value)}
                type="date"
                value={values.checkIn}
              />
            </div>
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Input
                className="rounded-lg"
                onChange={(event) => updateValue("checkOut", event.target.value)}
                type="date"
                value={values.checkOut}
              />
            </div>
            <div className="space-y-2">
              <Label>Adults</Label>
              <Input
                className="rounded-lg"
                min={1}
                onChange={(event) =>
                  updateValue("adults", Number(event.target.value))
                }
                type="number"
                value={values.adults}
              />
            </div>
            <div className="space-y-2">
              <Label>Children</Label>
              <Input
                className="rounded-lg"
                min={0}
                onChange={(event) =>
                  updateValue("children", Number(event.target.value))
                }
                type="number"
                value={values.children}
              />
            </div>
            <div className="space-y-2">
              <Label>Rate</Label>
              <Input
                className="rounded-lg"
                min={0}
                onChange={(event) => updateValue("rate", event.target.value)}
                type="number"
                value={values.rate}
              />
            </div>
            <div className="space-y-2">
              <Label>Deposit paid (optional)</Label>
              <Input
                className="rounded-lg"
                min={0}
                onChange={(event) => updateValue("deposit", event.target.value)}
                type="number"
                value={values.deposit}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select
                value={values.paymentMethod}
                onValueChange={(value) => updateValue("paymentMethod", value)}
              >
                <SelectTrigger className="h-10 w-full rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                  <SelectItem value="E-wallet">E-wallet</SelectItem>
                  <SelectItem value="Credit card">Credit card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes (optional)</Label>
              <Textarea
                className="min-h-20 rounded-lg"
                onChange={(event) => updateValue("notes", event.target.value)}
                placeholder="ID check, guest requests, payment notes..."
                value={values.notes}
              />
            </div>
          </div>

          {exceedsCapacity ? (
            <p className="text-sm font-medium text-red-600">
              Guest count exceeds selected room capacity.
            </p>
          ) : null}
          </div>

          <SheetFooter className="border-t border-zinc-200 bg-white p-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-zinc-500">
                    Total
                  </p>
                  <p className="mt-1 text-2xl font-bold text-zinc-950">
                    {currency.format(roomTotal)}
                  </p>
                </div>
                <p className="pb-1 text-sm font-medium text-zinc-500">
                  {nights} night{nights === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={!canSubmit} type="submit">
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save walk-in"
                )}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function RequestHandoffCard({
  departments,
  guests,
  isPending,
  onCreate,
  onResolve,
  requests,
  resolvingId,
}: {
  departments: ReceptionDepartment[];
  guests: ReceptionGuest[];
  isPending: boolean;
  onCreate: (input: {
    department: string;
    note: string;
    priority: "Normal" | "Urgent";
    reservationId?: string;
    roomOrArea: string;
  }) => Promise<unknown>;
  onResolve: (id: string) => void;
  requests: ReceptionRequest[];
  resolvingId: string;
}) {
  const activeDepartments = departments.filter(
    (department) => department.status === "Active",
  );
  const [department, setDepartment] = useState("");
  const selectedDepartment = department || activeDepartments[0]?.name || "";
  const [priority, setPriority] = useState<"Normal" | "Urgent">("Normal");
  const [reservationId, setReservationId] = useState("");
  const [roomOrArea, setRoomOrArea] = useState("");
  const [note, setNote] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedGuest = guests.find((guest) => guest.id === reservationId);
    const targetRoomOrArea = roomOrArea || selectedGuest?.room || "";

    if (!targetRoomOrArea.trim()) {
      toast.error("Room or area is required.");
      return;
    }

    if (!note.trim()) {
      toast.error("Request note is required.");
      return;
    }

    if (!selectedDepartment) {
      toast.error("Department is required.");
      return;
    }

    try {
      await onCreate({
        department: selectedDepartment,
        note,
        priority,
        reservationId: reservationId || undefined,
        roomOrArea: targetRoomOrArea,
      });
      setNote("");
      setRoomOrArea("");
      setReservationId("");
      setPriority("Normal");
    } catch {
      // Mutation onError already shows toast.
    }
  }

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
          <Send className="size-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-950">Send request</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Route guest issue to operations team.
          </p>
        </div>
      </div>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Related guest (optional)</Label>
          <Select value={reservationId || "none"} onValueChange={(value) => {
            setReservationId(value === "none" ? "" : value);
            const selectedGuest = guests.find((guest) => guest.id === value);
            if (selectedGuest) {
              setRoomOrArea(selectedGuest.room);
            }
          }}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No linked guest</SelectItem>
              {guests.map((guest) => (
                <SelectItem key={guest.id} value={guest.id}>
                  {guest.room} - {guest.guest}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={selectedDepartment} onValueChange={setDepartment}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {activeDepartments.map((department) => (
                <SelectItem key={department.id} value={department.name}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Room / area</Label>
          <Input
            className="rounded-lg"
            onChange={(event) => setRoomOrArea(event.target.value)}
            placeholder="RM-101 or lobby"
            value={roomOrArea}
          />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as "Normal" | "Urgent")}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Request note</Label>
          <Textarea
            className="min-h-24 rounded-lg"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Guest issue, access instruction, preferred time..."
            value={note}
          />
        </div>

        <Button
          className="w-full"
          disabled={
            isPending ||
            !selectedDepartment ||
            !note.trim() ||
            !(roomOrArea.trim() || reservationId)
          }
          type="submit"
        >
          <Send className="size-4" />
          Send handoff
        </Button>
      </form>

      {requests.length ? (
        <div className="space-y-2 border-t border-zinc-200 pt-4">
          <p className="text-xs font-bold uppercase text-zinc-500">
            Recent handoffs
          </p>
          {requests.slice(0, 3).map((request) => (
            <div
              className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 p-3"
              key={request.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-950">
                  {request.roomOrArea}
                </p>
                <p className="mt-1 text-xs font-medium text-zinc-500">
                  {request.department} • {request.note}
                </p>
              </div>
              {request.status === "Resolved" ? (
                <Badge className="rounded-md border-zinc-200 bg-zinc-100 text-zinc-900" variant="outline">
                  Resolved
                </Badge>
              ) : (
                <Button
                  disabled={resolvingId === request.id}
                  onClick={() => onResolve(request.id)}
                  size="xs"
                  type="button"
                  variant="outline"
                >
                  Resolve
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function ShiftNotesCard({
  isPending,
  notes,
  onCreate,
}: {
  isPending: boolean;
  notes: ReceptionShiftNote[];
  onCreate: (input: { note: string; title: string }) => Promise<unknown>;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      toast.error("Shift note title is required.");
      return;
    }

    if (!note.trim()) {
      toast.error("Shift note is required.");
      return;
    }

    try {
      await onCreate({
        note,
        title,
      });
      setNote("");
      setTitle("");
    } catch {
      // Mutation onError already shows toast.
    }
  }

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
          <Clock3 className="size-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-950">Shift notes</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Visible to next front desk shift.
          </p>
        </div>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            className="rounded-lg"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Keep RM-101 key at counter"
            value={title}
          />
        </div>
        <div className="space-y-2">
          <Label>Note</Label>
          <Textarea
            className="min-h-20 rounded-lg"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Visible note for next shift..."
            value={note}
          />
        </div>
        <Button
          className="w-full"
          disabled={isPending || !title.trim() || !note.trim()}
          size="sm"
          type="submit"
        >
          <Plus className="size-4" />
          Save note
        </Button>
      </form>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
            No shift notes yet.
          </div>
        ) : null}
        {notes.slice(0, 4).map((shiftNote, index) => (
          <div className="rounded-xl border border-zinc-200 p-3" key={shiftNote.id}>
            <div className="flex items-center gap-2">
              {index % 2 === 0 ? (
                <BedDouble className="size-4 text-zinc-500" />
              ) : (
                <MessageSquareText className="size-4 text-zinc-500" />
              )}
              <p className="text-sm font-bold text-zinc-950">
                {shiftNote.title}
              </p>
            </div>
            <p className="mt-1 text-xs font-medium text-zinc-500">
              {shiftNote.note}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold uppercase text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
