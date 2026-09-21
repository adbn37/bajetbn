import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  archiveTripBooking,
  archiveTripItineraryItem,
  archiveTripTask,
  listTripBookings,
  listTripItineraryItems,
  listTripTasks,
  saveTripBooking,
  saveTripItineraryItem,
  saveTripTask,
  setTripTaskStatus,
} from '../../repositories/tripPlanningRepository';
import type {
  Space,
  SpaceMember,
  TripBooking,
  TripBookingType,
  TripItineraryCategory,
  TripItineraryItem,
  TripTask,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

type ItineraryDraft = {
  title: string;
  category: TripItineraryCategory;
  date: string;
  time: string;
  location: string;
  reference: string;
  note: string;
};

type TaskDraft = {
  title: string;
  assigneeUid: string;
  dueDate: string;
  note: string;
};

type BookingDraft = {
  title: string;
  bookingType: TripBookingType;
  provider: string;
  reference: string;
  date: string;
  time: string;
  location: string;
  amount: string;
  note: string;
};

const EMPTY_ITINERARY: ItineraryDraft = {
  title: '',
  category: 'activity',
  date: '',
  time: '',
  location: '',
  reference: '',
  note: '',
};

const EMPTY_TASK: TaskDraft = {
  title: '',
  assigneeUid: '',
  dueDate: '',
  note: '',
};

const EMPTY_BOOKING: BookingDraft = {
  title: '',
  bookingType: 'hotel',
  provider: '',
  reference: '',
  date: '',
  time: '',
  location: '',
  amount: '',
  note: '',
};

const itineraryCategories: Array<{
  value: TripItineraryCategory;
  label: string;
}> = [
  { value: 'flight', label: 'Flight' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'transport', label: 'Transport' },
  { value: 'activity', label: 'Activity' },
  { value: 'food', label: 'Food' },
  { value: 'other', label: 'Other' },
];

const bookingTypes: Array<{
  value: TripBookingType;
  label: string;
}> = [
  { value: 'flight', label: 'Flight' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'transport', label: 'Transport' },
  { value: 'activity', label: 'Activity' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

function optionalMoneyMinor(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const amount = Number(trimmed);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(
      'Enter a valid non-negative Booking amount.',
    );
  }

  return Math.round(amount * 100);
}

function moneyInputValue(value?: number | null) {
  if (value === undefined || value === null) {
    return '';
  }

  return (value / 100).toFixed(2);
}

function memberLabel(member: SpaceMember) {
  return (
    member.displayName
    || member.email
    || member.uid
  );
}

function itineraryDraftFromItem(
  item: TripItineraryItem,
): ItineraryDraft {
  return {
    title: item.title,
    category: item.category,
    date: item.date,
    time: item.time || '',
    location: item.location || '',
    reference: item.reference || '',
    note: item.note || '',
  };
}

function taskDraftFromItem(
  task: TripTask,
): TaskDraft {
  return {
    title: task.title,
    assigneeUid: task.assigneeUid || '',
    dueDate: task.dueDate || '',
    note: task.note || '',
  };
}

function bookingDraftFromItem(
  booking: TripBooking,
): BookingDraft {
  return {
    title: booking.title,
    bookingType: booking.bookingType,
    provider: booking.provider || '',
    reference: booking.reference || '',
    date: booking.date,
    time: booking.time || '',
    location: booking.location || '',
    amount: moneyInputValue(
      booking.amountMinor,
    ),
    note: booking.note || '',
  };
}

function ItineraryRow({
  item,
  canPlan,
  busy,
  onSave,
  onArchive,
}: {
  item: TripItineraryItem;
  canPlan: boolean;
  busy: boolean;
  onSave: (draft: ItineraryDraft) => Promise<void>;
  onArchive: () => void;
}) {
  const [draft, setDraft] =
    useState<ItineraryDraft>(
      () => itineraryDraftFromItem(item),
    );

  const changed =
    JSON.stringify(draft)
    !== JSON.stringify(
      itineraryDraftFromItem(item),
    );

  return (
    <tr>
      <td>
        <input
          className="trip-sheet-cell-input"
          type="date"
          value={draft.date}
          disabled={!canPlan || busy}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              date: event.target.value,
            }))
          }
        />
      </td>

      <td>
        <input
          className="trip-sheet-cell-input"
          type="time"
          value={draft.time}
          disabled={!canPlan || busy}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              time: event.target.value,
            }))
          }
        />
      </td>

      <td className="trip-sheet-main-cell">
        <input
          className="trip-sheet-cell-input"
          value={draft.title}
          maxLength={120}
          disabled={!canPlan || busy}
          aria-label="Plan item"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
        />
      </td>

      <td>
        <select
          className="trip-sheet-cell-input"
          value={draft.category}
          disabled={!canPlan || busy}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              category:
                (event.target.value as TripItineraryCategory),
            }))
          }
        >
          {itineraryCategories.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ),
          )}
        </select>
      </td>

      <td>
        <input
          className="trip-sheet-cell-input"
          value={draft.location}
          maxLength={160}
          disabled={!canPlan || busy}
          aria-label="Location"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              location: event.target.value,
            }))
          }
        />
      </td>

      <td>
        <input
          className="trip-sheet-cell-input"
          value={draft.reference}
          maxLength={100}
          disabled={!canPlan || busy}
          aria-label="Reference"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              reference: event.target.value,
            }))
          }
        />
      </td>

      <td>
        <input
          className="trip-sheet-cell-input"
          value={draft.note}
          maxLength={500}
          disabled={!canPlan || busy}
          aria-label="Note"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              note: event.target.value,
            }))
          }
        />
      </td>

      <td className="trip-sheet-actions-cell">
        {canPlan && (
          <div className="trip-sheet-row-actions">
            <button
              type="button"
              className="button primary compact"
              disabled={
                busy
                || !changed
                || !draft.title.trim()
                || !draft.date
              }
              onClick={() =>
                void onSave(draft)
              }
            >
              Save
            </button>

            <button
              type="button"
              className="button secondary compact"
              disabled={busy}
              onClick={onArchive}
            >
              Archive
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function TaskRow({
  task,
  members,
  currentMember,
  canPlan,
  busy,
  onSave,
  onToggleStatus,
  onArchive,
}: {
  task: TripTask;
  members: SpaceMember[];
  currentMember?: SpaceMember | null;
  canPlan: boolean;
  busy: boolean;
  onSave: (draft: TaskDraft) => Promise<void>;
  onToggleStatus: () => Promise<void>;
  onArchive: () => void;
}) {
  const [draft, setDraft] =
    useState<TaskDraft>(
      () => taskDraftFromItem(task),
    );

  const changed =
    JSON.stringify(draft)
    !== JSON.stringify(
      taskDraftFromItem(task),
    );

  const canSetStatus =
    canPlan
    || task.assigneeUid
      === currentMember?.uid;

  return (
    <tr
      className={
        task.status === 'completed'
          ? 'trip-sheet-completed-row'
          : undefined
      }
    >
      <td className="trip-sheet-check-cell">
        <input
          type="checkbox"
          checked={
            task.status === 'completed'
          }
          disabled={!canSetStatus || busy}
          aria-label={
            task.status === 'completed'
              ? `Reopen ${task.title}`
              : `Complete ${task.title}`
          }
          onChange={() =>
            void onToggleStatus()
          }
        />
      </td>

      <td className="trip-sheet-main-cell">
        <input
          className="trip-sheet-cell-input"
          value={draft.title}
          maxLength={120}
          disabled={!canPlan || busy}
          aria-label="Task"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
        />
      </td>

      <td>
        <select
          className="trip-sheet-cell-input"
          value={draft.assigneeUid}
          disabled={!canPlan || busy}
          aria-label="Assigned to"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              assigneeUid:
                event.target.value,
            }))
          }
        >
          <option value="">
            Unassigned
          </option>

          {members.map((member) => (
            <option
              key={member.uid}
              value={member.uid}
            >
              {memberLabel(member)}
            </option>
          ))}
        </select>
      </td>

      <td>
        <input
          className="trip-sheet-cell-input"
          type="date"
          value={draft.dueDate}
          disabled={!canPlan || busy}
          aria-label="Due date"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              dueDate: event.target.value,
            }))
          }
        />
      </td>

      <td>
        <input
          className="trip-sheet-cell-input"
          value={draft.note}
          maxLength={500}
          disabled={!canPlan || busy}
          aria-label="Task note"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              note: event.target.value,
            }))
          }
        />
      </td>

      <td className="trip-sheet-actions-cell">
        {canPlan && (
          <div className="trip-sheet-row-actions">
            <button
              type="button"
              className="button primary compact"
              disabled={
                busy
                || !changed
                || !draft.title.trim()
              }
              onClick={() =>
                void onSave(draft)
              }
            >
              Save
            </button>

            <button
              type="button"
              className="button secondary compact"
              disabled={busy}
              onClick={onArchive}
            >
              Archive
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function BookingRow({
  booking,
  currency,
  canPlan,
  busy,
  onSave,
  onArchive,
}: {
  booking: TripBooking;
  currency: string;
  canPlan: boolean;
  busy: boolean;
  onSave: (draft: BookingDraft) => Promise<void>;
  onArchive: () => void;
}) {
  const [draft, setDraft] =
    useState<BookingDraft>(
      () => bookingDraftFromItem(booking),
    );

  const changed =
    JSON.stringify(draft)
    !== JSON.stringify(
      bookingDraftFromItem(booking),
    );

  return (
    <tr>
      <td>
        <input
          className="trip-sheet-cell-input"
          type="date"
          value={draft.date}
          disabled={!canPlan || busy}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              date: event.target.value,
            }))
          }
        />
      </td>

      <td>
        <input
          className="trip-sheet-cell-input"
          type="time"
          value={draft.time}
          disabled={!canPlan || busy}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              time: event.target.value,
            }))
          }
        />
      </td>

      <td className="trip-sheet-main-cell">
        <input
          className="trip-sheet-cell-input"
          value={draft.title}
          maxLength={120}
          disabled={!canPlan || busy}
          aria-label="Booking"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
        />
      </td>

      <td>
        <select
          className="trip-sheet-cell-input"
          value={draft.bookingType}
          disabled={!canPlan || busy}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              bookingType:
                (event.target.value as TripBookingType),
            }))
          }
        >
          {bookingTypes.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ),
          )}
        </select>
      </td>

      <td>
        <input
          className="trip-sheet-cell-input"
          value={draft.provider}
          maxLength={120}
          disabled={!canPlan || busy}
          aria-label="Provider"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              provider: event.target.value,
            }))
          }
        />
      </td>

      <td>
        <input
          className="trip-sheet-cell-input"
          value={draft.location}
          maxLength={160}
          disabled={!canPlan || busy}
          aria-label="Booking location"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              location: event.target.value,
            }))
          }
        />
      </td>

      <td>
        <div className="trip-sheet-money-cell">
          <span>{currency}</span>
          <input
            className="trip-sheet-cell-input"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={draft.amount}
            disabled={!canPlan || busy}
            aria-label="Planned booking cost"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                amount: event.target.value,
              }))
            }
          />
        </div>
      </td>

      <td>
        <input
          className="trip-sheet-cell-input"
          value={draft.reference}
          maxLength={100}
          disabled={!canPlan || busy}
          aria-label="Booking reference"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              reference: event.target.value,
            }))
          }
        />
      </td>

      <td>
        <input
          className="trip-sheet-cell-input"
          value={draft.note}
          maxLength={500}
          disabled={!canPlan || busy}
          aria-label="Booking note"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              note: event.target.value,
            }))
          }
        />
      </td>

      <td className="trip-sheet-actions-cell">
        {canPlan && (
          <div className="trip-sheet-row-actions">
            <button
              type="button"
              className="button primary compact"
              disabled={
                busy
                || !changed
                || !draft.title.trim()
                || !draft.date
              }
              onClick={() =>
                void onSave(draft)
              }
            >
              Save
            </button>

            <button
              type="button"
              className="button secondary compact"
              disabled={busy}
              onClick={onArchive}
            >
              Archive
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export function TripPlanningPanel({
  space,
  members,
  currentMember,
  initialView = 'itinerary',
}: {
  space: Space;
  members: SpaceMember[];
  currentMember?: SpaceMember | null;
  initialView?:
    | 'itinerary'
    | 'tasks'
    | 'bookings';
}) {
  const [itinerary, setItinerary] =
    useState<TripItineraryItem[]>([]);

  const [tasks, setTasks] =
    useState<TripTask[]>([]);

  const [bookings, setBookings] =
    useState<TripBooking[]>([]);

  const [planningView, setPlanningView] =
    useState<
      'itinerary'
      | 'tasks'
      | 'bookings'
    >(initialView);

  useEffect(() => {
    setPlanningView(initialView);
  }, [initialView]);

  const [newItinerary, setNewItinerary] =
    useState<ItineraryDraft>(
      EMPTY_ITINERARY,
    );

  const [newTask, setNewTask] =
    useState<TaskDraft>(
      EMPTY_TASK,
    );

  const [newBooking, setNewBooking] =
    useState<BookingDraft>(
      EMPTY_BOOKING,
    );

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState('');

  const [error, setError] =
    useState('');

  const [
    archiveRequest,
    setArchiveRequest,
  ] = useState<{
    kind:
      | 'itinerary'
      | 'task'
      | 'booking';
    id: string;
    title: string;
  } | null>(null);

  const activeMembers =
    useMemo(
      () =>
        members.filter(
          (member) =>
            (member.status || 'active')
            === 'active',
        ),
      [members],
    );

  const canPlan =
    [
      'owner',
      'admin',
      'contributor',
    ].includes(
      currentMember?.role || '',
    );

  const plannedBookingMinor =
    useMemo(
      () =>
        bookings.reduce(
          (sum, booking) =>
            sum
            + (
              booking.amountMinor
              || 0
            ),
          0,
        ),
      [bookings],
    );

  const loadPlanning =
    useCallback(async () => {
      setLoading(true);
      setError('');

      try {
        const [
          nextItinerary,
          nextTasks,
          nextBookings,
        ] = await Promise.all([
          listTripItineraryItems(
            space.id,
          ),
          listTripTasks(
            space.id,
          ),
          listTripBookings(
            space.id,
          ),
        ]);

        setItinerary(nextItinerary);
        setTasks(nextTasks);
        setBookings(nextBookings);
      } catch (nextError) {
        setError(
          getErrorMessage(
            nextError,
          ),
        );
      } finally {
        setLoading(false);
      }
    }, [space.id]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void loadPlanning();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadPlanning]);

  async function runMutation(
    label: string,
    action: () => Promise<unknown>,
  ) {
    setBusy(label);
    setError('');

    try {
      await action();
      await loadPlanning();
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );
      throw nextError;
    } finally {
      setBusy('');
    }
  }

  function askArchive(
    kind:
      | 'itinerary'
      | 'task'
      | 'booking',
    id: string,
    title: string,
  ) {
    setArchiveRequest({
      kind,
      id,
      title,
    });
  }

  async function confirmArchive() {
    if (!archiveRequest) {
      return;
    }

    const request =
      archiveRequest;

    setArchiveRequest(null);

    if (
      request.kind
      === 'itinerary'
    ) {
      await runMutation(
        'itinerary-archive',
        () =>
          archiveTripItineraryItem({
            spaceId: space.id,
            itemId: request.id,
          }),
      );
      return;
    }

    if (
      request.kind
      === 'task'
    ) {
      await runMutation(
        'task-archive',
        () =>
          archiveTripTask({
            spaceId: space.id,
            taskId: request.id,
          }),
      );
      return;
    }

    await runMutation(
      'booking-archive',
      () =>
        archiveTripBooking({
          spaceId: space.id,
          bookingId: request.id,
        }),
    );
  }

  async function saveItineraryDraft(
    itemId: string | undefined,
    draft: ItineraryDraft,
  ) {
    if (
      !draft.title.trim()
      || !draft.date
    ) {
      throw new Error(
        'Add a title and date.',
      );
    }

    await runMutation(
      itemId
        ? `itinerary-${itemId}`
        : 'itinerary-new',
      () =>
        saveTripItineraryItem({
          spaceId: space.id,
          itemId,
          title:
            draft.title.trim(),
          category:
            draft.category,
          date:
            draft.date,
          time:
            draft.time
            || undefined,
          location:
            draft.location.trim()
            || undefined,
          reference:
            draft.reference.trim()
            || undefined,
          note:
            draft.note.trim()
            || undefined,
        }),
    );
  }

  async function saveTaskDraft(
    taskId: string | undefined,
    draft: TaskDraft,
  ) {
    if (!draft.title.trim()) {
      throw new Error(
        'Add a task.',
      );
    }

    await runMutation(
      taskId
        ? `task-${taskId}`
        : 'task-new',
      () =>
        saveTripTask({
          spaceId: space.id,
          taskId,
          title:
            draft.title.trim(),
          assigneeUid:
            draft.assigneeUid
            || undefined,
          dueDate:
            draft.dueDate
            || undefined,
          note:
            draft.note.trim()
            || undefined,
        }),
    );
  }

  async function saveBookingDraft(
    bookingId: string | undefined,
    draft: BookingDraft,
  ) {
    if (
      !draft.title.trim()
      || !draft.date
    ) {
      throw new Error(
        'Add a booking title and date.',
      );
    }

    await runMutation(
      bookingId
        ? `booking-${bookingId}`
        : 'booking-new',
      () =>
        saveTripBooking({
          spaceId: space.id,
          bookingId,
          title:
            draft.title.trim(),
          bookingType:
            draft.bookingType,
          provider:
            draft.provider.trim()
            || undefined,
          reference:
            draft.reference.trim()
            || undefined,
          date:
            draft.date,
          time:
            draft.time
            || undefined,
          location:
            draft.location.trim()
            || undefined,
          amountMinor:
            optionalMoneyMinor(
              draft.amount,
            ),
          currency:
            space.currency,
          note:
            draft.note.trim()
            || undefined,
        }),
    );
  }

  return (
    <section
      id="trip-planning"
      className="trip-planning-panel trip-sheet-planning-v115"
      data-trip-spreadsheet
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            Trip worksheet
          </span>

          <h2>Trip Plan</h2>

          <p className="muted">
            Edit the Trip like a spreadsheet.
            Changes stay shared with the Trip.
          </p>
        </div>

        <div className="trip-sheet-summary">
          <span>
            {itinerary.length}
            {' '}stops
          </span>

          <span>
            {
              tasks.filter(
                (task) =>
                  task.status
                  === 'open',
              ).length
            }
            {' '}tasks
          </span>

          <span>
            {formatMoney(
              plannedBookingMinor,
              space.currency,
            )}
            {' '}planned
          </span>
        </div>
      </div>

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {archiveRequest && (
        <div className="notice trip-archive-confirmation">
          <div>
            <strong>
              Archive {archiveRequest.title}?
            </strong>

            <p>
              It will leave the active worksheet,
              while its saved history stays preserved.
            </p>
          </div>

          <div className="trip-planning-card-actions">
            <button
              type="button"
              className="button secondary compact"
              disabled={Boolean(busy)}
              onClick={() =>
                setArchiveRequest(null)
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="button primary compact"
              disabled={Boolean(busy)}
              onClick={() =>
                void confirmArchive()
              }
            >
              Archive
            </button>
          </div>
        </div>
      )}

      <div
        className="segmented-control trip-planning-tabs"
        role="tablist"
        aria-label="Trip Plan worksheet"
      >
        <button
          type="button"
          className={
            planningView
            === 'itinerary'
              ? 'active'
              : ''
          }
          onClick={() =>
            setPlanningView(
              'itinerary',
            )
          }
        >
          Itinerary
        </button>

        <button
          type="button"
          className={
            planningView
            === 'tasks'
              ? 'active'
              : ''
          }
          onClick={() =>
            setPlanningView(
              'tasks',
            )
          }
        >
          Tasks
        </button>

        <button
          type="button"
          className={
            planningView
            === 'bookings'
              ? 'active'
              : ''
          }
          onClick={() =>
            setPlanningView(
              'bookings',
            )
          }
        >
          Bookings
        </button>
      </div>

      {loading ? (
        <div className="notice">
          Loading Trip worksheetâ€¦
        </div>
      ) : (
        <div className="trip-planning-grid">
          <section
            className="trip-sheet-section"
            hidden={
              planningView
              !== 'itinerary'
            }
          >
            <div className="trip-planning-heading">
              <div>
                <h3>Itinerary</h3>
                <small>
                  Date, time and plan in one sheet.
                </small>
              </div>

              <span className="type-badge">
                {itinerary.length}
              </span>
            </div>

            <div className="trip-sheet-scroll">
              <table
                className="trip-sheet-table trip-sheet-itinerary"
                aria-label="Trip itinerary worksheet"
              >
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Plan</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Ref</th>
                    <th>Note</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {canPlan && (
                    <tr className="trip-sheet-new-row">
                      <td>
                        <input
                          className="trip-sheet-cell-input"
                          type="date"
                          value={newItinerary.date}
                          onChange={(event) =>
                            setNewItinerary(
                              (current) => ({
                                ...current,
                                date: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="trip-sheet-cell-input"
                          type="time"
                          value={newItinerary.time}
                          onChange={(event) =>
                            setNewItinerary(
                              (current) => ({
                                ...current,
                                time: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td className="trip-sheet-main-cell">
                        <input
                          className="trip-sheet-cell-input"
                          value={newItinerary.title}
                          maxLength={120}
                          placeholder="Add a stopâ€¦"
                          aria-label="New itinerary item"
                          onChange={(event) =>
                            setNewItinerary(
                              (current) => ({
                                ...current,
                                title: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td>
                        <select
                          className="trip-sheet-cell-input"
                          value={newItinerary.category}
                          onChange={(event) =>
                            setNewItinerary(
                              (current) => ({
                                ...current,
                                category:
                                  (event.target.value as TripItineraryCategory),
                              }),
                            )
                          }
                        >
                          {itineraryCategories.map(
                            (option) => (
                              <option
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ),
                          )}
                        </select>
                      </td>

                      <td>
                        <input
                          className="trip-sheet-cell-input"
                          value={newItinerary.location}
                          maxLength={160}
                          placeholder="Location"
                          onChange={(event) =>
                            setNewItinerary(
                              (current) => ({
                                ...current,
                                location: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="trip-sheet-cell-input"
                          value={newItinerary.reference}
                          maxLength={100}
                          placeholder="Ref"
                          onChange={(event) =>
                            setNewItinerary(
                              (current) => ({
                                ...current,
                                reference: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="trip-sheet-cell-input"
                          value={newItinerary.note}
                          maxLength={500}
                          placeholder="Note"
                          onChange={(event) =>
                            setNewItinerary(
                              (current) => ({
                                ...current,
                                note: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td className="trip-sheet-actions-cell">
                        <button
                          type="button"
                          className="button primary compact"
                          disabled={
                            Boolean(busy)
                            || !newItinerary.title.trim()
                            || !newItinerary.date
                          }
                          onClick={() =>
                            void saveItineraryDraft(
                              undefined,
                              newItinerary,
                            ).then(() =>
                              setNewItinerary({
                                ...EMPTY_ITINERARY,
                              }),
                            )
                          }
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  )}

                  {itinerary.map((item) => (
                    <ItineraryRow
                      key={
                        item.id
                        + ':'
                        + (
                          item.updatedAt
                            ?.toMillis?.()
                          || 0
                        )
                      }
                      item={item}
                      canPlan={canPlan}
                      busy={Boolean(busy)}
                      onSave={(draft) =>
                        saveItineraryDraft(
                          item.id,
                          draft,
                        )
                      }
                      onArchive={() =>
                        askArchive(
                          'itinerary',
                          item.id,
                          item.title,
                        )
                      }
                    />
                  ))}

                  {!canPlan
                    && itinerary.length === 0
                    && (
                      <tr>
                        <td
                          colSpan={8}
                          className="trip-sheet-empty-cell"
                        >
                          No itinerary yet.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </section>

          <section
            className="trip-sheet-section"
            hidden={
              planningView
              !== 'tasks'
            }
          >
            <div className="trip-planning-heading">
              <div>
                <h3>Tasks</h3>
                <small>
                  Tick it off when it is done.
                </small>
              </div>

              <span className="type-badge">
                {
                  tasks.filter(
                    (task) =>
                      task.status
                      === 'open',
                  ).length
                }
                {' '}open
              </span>
            </div>

            <div className="trip-sheet-scroll">
              <table
                className="trip-sheet-table trip-sheet-tasks"
                aria-label="Trip tasks worksheet"
              >
                <thead>
                  <tr>
                    <th>Done</th>
                    <th>Task</th>
                    <th>Assigned to</th>
                    <th>Due</th>
                    <th>Note</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {canPlan && (
                    <tr className="trip-sheet-new-row">
                      <td className="trip-sheet-check-cell">
                        +
                      </td>

                      <td className="trip-sheet-main-cell">
                        <input
                          className="trip-sheet-cell-input"
                          value={newTask.title}
                          maxLength={120}
                          placeholder="Add a taskâ€¦"
                          onChange={(event) =>
                            setNewTask(
                              (current) => ({
                                ...current,
                                title: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td>
                        <select
                          className="trip-sheet-cell-input"
                          value={newTask.assigneeUid}
                          onChange={(event) =>
                            setNewTask(
                              (current) => ({
                                ...current,
                                assigneeUid: event.target.value,
                              }),
                            )
                          }
                        >
                          <option value="">
                            Unassigned
                          </option>

                          {activeMembers.map(
                            (member) => (
                              <option
                                key={member.uid}
                                value={member.uid}
                              >
                                {memberLabel(member)}
                              </option>
                            ),
                          )}
                        </select>
                      </td>

                      <td>
                        <input
                          className="trip-sheet-cell-input"
                          type="date"
                          value={newTask.dueDate}
                          onChange={(event) =>
                            setNewTask(
                              (current) => ({
                                ...current,
                                dueDate: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="trip-sheet-cell-input"
                          value={newTask.note}
                          maxLength={500}
                          placeholder="Note"
                          onChange={(event) =>
                            setNewTask(
                              (current) => ({
                                ...current,
                                note: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td className="trip-sheet-actions-cell">
                        <button
                          type="button"
                          className="button primary compact"
                          disabled={
                            Boolean(busy)
                            || !newTask.title.trim()
                          }
                          onClick={() =>
                            void saveTaskDraft(
                              undefined,
                              newTask,
                            ).then(() =>
                              setNewTask({
                                ...EMPTY_TASK,
                              }),
                            )
                          }
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  )}

                  {tasks.map((task) => (
                    <TaskRow
                      key={
                        task.id
                        + ':'
                        + (
                          task.updatedAt
                            ?.toMillis?.()
                          || 0
                        )
                      }
                      task={task}
                      members={activeMembers}
                      currentMember={currentMember}
                      canPlan={canPlan}
                      busy={Boolean(busy)}
                      onSave={(draft) =>
                        saveTaskDraft(
                          task.id,
                          draft,
                        )
                      }
                      onToggleStatus={() =>
                        runMutation(
                          `task-status-${task.id}`,
                          () =>
                            setTripTaskStatus({
                              spaceId: space.id,
                              taskId: task.id,
                              status:
                                task.status
                                === 'completed'
                                  ? 'open'
                                  : 'completed',
                            }),
                        )
                      }
                      onArchive={() =>
                        askArchive(
                          'task',
                          task.id,
                          task.title,
                        )
                      }
                    />
                  ))}

                  {!canPlan
                    && tasks.length === 0
                    && (
                      <tr>
                        <td
                          colSpan={6}
                          className="trip-sheet-empty-cell"
                        >
                          No tasks yet.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </section>

          <section
            className="trip-sheet-section"
            hidden={
              planningView
              !== 'bookings'
            }
          >
            <div className="trip-planning-heading">
              <div>
                <h3>Bookings</h3>
                <small>
                  Planned cost only.
                  Record actual payment in Trip Expenses.
                </small>
              </div>

              <span className="type-badge">
                {formatMoney(
                  plannedBookingMinor,
                  space.currency,
                )}
              </span>
            </div>

            <div className="trip-sheet-scroll">
              <table
                className="trip-sheet-table trip-sheet-bookings"
                aria-label="Trip bookings worksheet"
              >
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Booking</th>
                    <th>Type</th>
                    <th>Provider</th>
                    <th>Location</th>
                    <th>Planned cost</th>
                    <th>Ref</th>
                    <th>Note</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {canPlan && (
                    <tr className="trip-sheet-new-row">
                      <td>
                        <input
                          className="trip-sheet-cell-input"
                          type="date"
                          value={newBooking.date}
                          onChange={(event) =>
                            setNewBooking(
                              (current) => ({
                                ...current,
                                date: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="trip-sheet-cell-input"
                          type="time"
                          value={newBooking.time}
                          onChange={(event) =>
                            setNewBooking(
                              (current) => ({
                                ...current,
                                time: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td className="trip-sheet-main-cell">
                        <input
                          className="trip-sheet-cell-input"
                          value={newBooking.title}
                          maxLength={120}
                          placeholder="Add bookingâ€¦"
                          onChange={(event) =>
                            setNewBooking(
                              (current) => ({
                                ...current,
                                title: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td>
                        <select
                          className="trip-sheet-cell-input"
                          value={newBooking.bookingType}
                          onChange={(event) =>
                            setNewBooking(
                              (current) => ({
                                ...current,
                                bookingType:
                                  (event.target.value as TripBookingType),
                              }),
                            )
                          }
                        >
                          {bookingTypes.map(
                            (option) => (
                              <option
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ),
                          )}
                        </select>
                      </td>

                      <td>
                        <input
                          className="trip-sheet-cell-input"
                          value={newBooking.provider}
                          maxLength={120}
                          placeholder="Provider"
                          onChange={(event) =>
                            setNewBooking(
                              (current) => ({
                                ...current,
                                provider: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="trip-sheet-cell-input"
                          value={newBooking.location}
                          maxLength={160}
                          placeholder="Location"
                          onChange={(event) =>
                            setNewBooking(
                              (current) => ({
                                ...current,
                                location: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td>
                        <div className="trip-sheet-money-cell">
                          <span>
                            {space.currency}
                          </span>

                          <input
                            className="trip-sheet-cell-input"
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={newBooking.amount}
                            placeholder="0.00"
                            onChange={(event) =>
                              setNewBooking(
                                (current) => ({
                                  ...current,
                                  amount: event.target.value,
                                }),
                              )
                            }
                          />
                        </div>
                      </td>

                      <td>
                        <input
                          className="trip-sheet-cell-input"
                          value={newBooking.reference}
                          maxLength={100}
                          placeholder="Ref"
                          onChange={(event) =>
                            setNewBooking(
                              (current) => ({
                                ...current,
                                reference: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="trip-sheet-cell-input"
                          value={newBooking.note}
                          maxLength={500}
                          placeholder="Note"
                          onChange={(event) =>
                            setNewBooking(
                              (current) => ({
                                ...current,
                                note: event.target.value,
                              }),
                            )
                          }
                        />
                      </td>

                      <td className="trip-sheet-actions-cell">
                        <button
                          type="button"
                          className="button primary compact"
                          disabled={
                            Boolean(busy)
                            || !newBooking.title.trim()
                            || !newBooking.date
                          }
                          onClick={() =>
                            void saveBookingDraft(
                              undefined,
                              newBooking,
                            ).then(() =>
                              setNewBooking({
                                ...EMPTY_BOOKING,
                              }),
                            )
                          }
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  )}

                  {bookings.map((booking) => (
                    <BookingRow
                      key={
                        booking.id
                        + ':'
                        + (
                          booking.updatedAt
                            ?.toMillis?.()
                          || 0
                        )
                      }
                      booking={booking}
                      currency={space.currency}
                      canPlan={canPlan}
                      busy={Boolean(busy)}
                      onSave={(draft) =>
                        saveBookingDraft(
                          booking.id,
                          draft,
                        )
                      }
                      onArchive={() =>
                        askArchive(
                          'booking',
                          booking.id,
                          booking.title,
                        )
                      }
                    />
                  ))}

                  {!canPlan
                    && bookings.length === 0
                    && (
                      <tr>
                        <td
                          colSpan={10}
                          className="trip-sheet-empty-cell"
                        >
                          No bookings yet.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
