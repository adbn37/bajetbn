import { type FormEvent, useEffect, useState } from 'react';
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
  TripItineraryItem,
  TripTask,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

function formText(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function optionalMoneyMinor(value: string) {
  if (!value) return undefined;

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Enter a valid non-negative Booking amount.');
  }

  return Math.round(amount * 100);
}

export function TripPlanningPanel({
  space,
  members,
  currentMember,
}: {
  space: Space;
  members: SpaceMember[];
  currentMember?: SpaceMember | null;
}) {
  const [itinerary, setItinerary] = useState<TripItineraryItem[]>([]);
  const [tasks, setTasks] = useState<TripTask[]>([]);
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [archiveRequest, setArchiveRequest] = useState<{
    kind: 'itinerary' | 'task' | 'booking';
    id: string;
    title: string;
  } | null>(null);

  const activeMembers = members.filter(
    (member) => (member.status || 'active') === 'active',
  );

  const canPlan = ['owner', 'admin', 'contributor'].includes(
    currentMember?.role || '',
  );

  async function loadPlanning() {
    setLoading(true);
    setError('');

    try {
      const [nextItinerary, nextTasks, nextBookings] = await Promise.all([
        listTripItineraryItems(space.id),
        listTripTasks(space.id),
        listTripBookings(space.id),
      ]);

      setItinerary(nextItinerary);
      setTasks(nextTasks);
      setBookings(nextBookings);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlanning();
  }, [space.id]);

  async function runMutation(label: string, action: () => Promise<unknown>) {
    setBusy(label);
    setError('');

    try {
      await action();
      await loadPlanning();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy('');
    }
  }

  function confirmArchive() {
    if (!archiveRequest) return;

    const request = archiveRequest;
    setArchiveRequest(null);

    if (request.kind === 'itinerary') {
      void runMutation('itinerary-archive', () =>
        archiveTripItineraryItem({
          spaceId: space.id,
          itemId: request.id,
        }),
      );
      return;
    }

    if (request.kind === 'task') {
      void runMutation('task-archive', () =>
        archiveTripTask({
          spaceId: space.id,
          taskId: request.id,
        }),
      );
      return;
    }

    void runMutation('booking-archive', () =>
      archiveTripBooking({
        spaceId: space.id,
        bookingId: request.id,
      }),
    );
  }
  function submitItinerary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);

    void runMutation('itinerary', async () => {
      await saveTripItineraryItem({
        spaceId: space.id,
        title: formText(form, 'title'),
        category: formText(form, 'category') as
          | 'flight'
          | 'hotel'
          | 'transport'
          | 'activity'
          | 'food'
          | 'other',
        date: formText(form, 'date'),
        time: formText(form, 'time') || undefined,
        location: formText(form, 'location') || undefined,
        reference: formText(form, 'reference') || undefined,
        note: formText(form, 'note') || undefined,
      });

      element.reset();
    });
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);

    void runMutation('task', async () => {
      await saveTripTask({
        spaceId: space.id,
        title: formText(form, 'title'),
        assigneeUid: formText(form, 'assigneeUid') || undefined,
        dueDate: formText(form, 'dueDate') || undefined,
        note: formText(form, 'note') || undefined,
      });

      element.reset();
    });
  }

  function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const amount = formText(form, 'amount');

    void runMutation('booking', async () => {
      await saveTripBooking({
        spaceId: space.id,
        title: formText(form, 'title'),
        bookingType: formText(form, 'bookingType') as
          | 'flight'
          | 'hotel'
          | 'transport'
          | 'activity'
          | 'event'
          | 'other',
        provider: formText(form, 'provider') || undefined,
        reference: formText(form, 'reference') || undefined,
        date: formText(form, 'date'),
        time: formText(form, 'time') || undefined,
        location: formText(form, 'location') || undefined,
        amountMinor: optionalMoneyMinor(amount),
        currency: space.currency,
        note: formText(form, 'note') || undefined,
      });

      element.reset();
    });
  }

  return (
    <section id="trip-planning" className="trip-planning-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Trip planning</span>
          <h2>Itinerary, Tasks & Bookings</h2>
          <p className="muted">
            Keep the group plan together without mixing travel Bookings with SME
            POS reservations.
          </p>
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}
      {archiveRequest && (
        <div className="notice trip-archive-confirmation">
          <div>
            <strong>Archive {archiveRequest.title}?</strong>
            <p>
              It will be removed from the active Trip plan while its saved
              history remains preserved.
            </p>
          </div>

          <div className="trip-planning-card-actions">
            <button
              type="button"
              className="button secondary compact"
              disabled={Boolean(busy)}
              onClick={() => setArchiveRequest(null)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="button primary compact"
              disabled={Boolean(busy)}
              onClick={confirmArchive}
            >
              Archive
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="notice">Loading Trip planning…</div>
      ) : (
        <div className="trip-planning-grid">
          <section className="trip-planning-section">
            <div className="trip-planning-heading">
              <div>
                <h3>Itinerary</h3>
                <small>{itinerary.length} planned stop{itinerary.length === 1 ? '' : 's'}</small>
              </div>
            </div>

            {canPlan && (
              <details className="trip-planning-create">
                <summary>Add itinerary item</summary>

                <form className="trip-planning-form" onSubmit={submitItinerary}>
                  <label className="field">
                    <span>Title</span>
                    <input name="title" required maxLength={120} placeholder="Flight to Kuala Lumpur" />
                  </label>

                  <div className="trip-planning-form-row">
                    <label className="field">
                      <span>Category</span>
                      <select name="category" defaultValue="activity">
                        <option value="flight">Flight</option>
                        <option value="hotel">Hotel</option>
                        <option value="transport">Transport</option>
                        <option value="activity">Activity</option>
                        <option value="food">Food</option>
                        <option value="other">Other</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>Date</span>
                      <input name="date" type="date" required />
                    </label>

                    <label className="field">
                      <span>Time</span>
                      <input name="time" type="time" />
                    </label>
                  </div>

                  <label className="field">
                    <span>Location</span>
                    <input name="location" maxLength={160} placeholder="Airport, hotel, attraction…" />
                  </label>

                  <label className="field">
                    <span>Booking reference</span>
                    <input name="reference" maxLength={100} placeholder="Optional" />
                  </label>

                  <label className="field">
                    <span>Note</span>
                    <textarea name="note" rows={2} maxLength={500} />
                  </label>

                  <button className="button primary" disabled={Boolean(busy)}>
                    Add to Itinerary
                  </button>
                </form>
              </details>
            )}

            {!itinerary.length ? (
              <div className="notice">
                <strong>No itinerary yet.</strong>{' '}
                Add the first flight, hotel, transport or activity.
              </div>
            ) : (
              <div className="trip-planning-list">
                {itinerary.map((item) => (
                  <article className="trip-planning-card" key={item.id}>
                    <div>
                      <span className="eyebrow">{item.category}</span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.date}
                        {item.time ? ` · ${item.time}` : ''}
                        {item.location ? ` · ${item.location}` : ''}
                      </small>
                      {item.reference && <small>Ref: {item.reference}</small>}
                      {item.note && <p>{item.note}</p>}
                    </div>

                    {canPlan && (
                      <button
                        type="button"
                        className="button secondary compact"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          setArchiveRequest({
                            kind: 'itinerary',
                            id: item.id,
                            title: item.title,
                          })
                        }
                      >
                        Archive
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="trip-planning-section">
            <div className="trip-planning-heading">
              <div>
                <h3>Trip Tasks</h3>
                <small>{tasks.filter((task) => task.status === 'open').length} open</small>
              </div>
            </div>

            {canPlan && (
              <details className="trip-planning-create">
                <summary>Add Task</summary>

                <form className="trip-planning-form" onSubmit={submitTask}>
                  <label className="field">
                    <span>Task</span>
                    <input name="title" required maxLength={120} placeholder="Check passport validity" />
                  </label>

                  <div className="trip-planning-form-row">
                    <label className="field">
                      <span>Assign to</span>
                      <select name="assigneeUid" defaultValue="">
                        <option value="">Unassigned</option>
                        {activeMembers.map((member) => (
                          <option key={member.uid} value={member.uid}>
                            {member.displayName || member.email || member.uid}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Due date</span>
                      <input name="dueDate" type="date" />
                    </label>
                  </div>

                  <label className="field">
                    <span>Note</span>
                    <textarea name="note" rows={2} maxLength={500} />
                  </label>

                  <button className="button primary" disabled={Boolean(busy)}>
                    Add Task
                  </button>
                </form>
              </details>
            )}

            {!tasks.length ? (
              <div className="notice">
                <strong>No Trip Tasks yet.</strong>{' '}
                Assign useful preparation work to Trip members.
              </div>
            ) : (
              <div className="trip-planning-list">
                {tasks.map((task) => {
                  const canSetStatus =
                    canPlan || task.assigneeUid === currentMember?.uid;

                  return (
                    <article
                      className={`trip-planning-card${task.status === 'completed' ? ' completed' : ''}`}
                      key={task.id}
                    >
                      <div>
                        <span className="eyebrow">
                          {task.status === 'completed' ? 'Completed' : 'Task'}
                        </span>
                        <strong>{task.title}</strong>
                        <small>
                          {task.assigneeName || task.assigneeEmail || 'Unassigned'}
                          {task.dueDate ? ` · Due ${task.dueDate}` : ''}
                        </small>
                        {task.note && <p>{task.note}</p>}
                      </div>

                      <div className="trip-planning-card-actions">
                        {canSetStatus && (
                          <button
                            type="button"
                            className="button secondary compact"
                            disabled={Boolean(busy)}
                            onClick={() =>
                              void runMutation('task-status', () =>
                                setTripTaskStatus({
                                  spaceId: space.id,
                                  taskId: task.id,
                                  status: task.status === 'completed' ? 'open' : 'completed',
                                }),
                              )
                            }
                          >
                            {task.status === 'completed' ? 'Reopen' : 'Complete'}
                          </button>
                        )}

                        {canPlan && (
                          <button
                            type="button"
                            className="button secondary compact"
                            disabled={Boolean(busy)}
                            onClick={() =>
                              setArchiveRequest({
                                kind: 'task',
                                id: task.id,
                                title: task.title,
                              })
                            }
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="trip-planning-section">
            <div className="trip-planning-heading">
              <div>
                <h3>Trip Bookings</h3>
                <small>{bookings.length} saved</small>
              </div>
            </div>

            <div className="notice">
              Booking amounts here are planning references only. Record actual
              spending under Trip Expenses so financial totals keep one source
              of truth.
            </div>

            {canPlan && (
              <details className="trip-planning-create">
                <summary>Add Booking</summary>

                <form className="trip-planning-form" onSubmit={submitBooking}>
                  <label className="field">
                    <span>Booking</span>
                    <input name="title" required maxLength={120} placeholder="Hotel in Tokyo" />
                  </label>

                  <div className="trip-planning-form-row">
                    <label className="field">
                      <span>Type</span>
                      <select name="bookingType" defaultValue="hotel">
                        <option value="flight">Flight</option>
                        <option value="hotel">Hotel</option>
                        <option value="transport">Transport</option>
                        <option value="activity">Activity</option>
                        <option value="event">Event</option>
                        <option value="other">Other</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>Date</span>
                      <input name="date" type="date" required />
                    </label>

                    <label className="field">
                      <span>Time</span>
                      <input name="time" type="time" />
                    </label>
                  </div>

                  <label className="field">
                    <span>Provider</span>
                    <input name="provider" maxLength={120} placeholder="Airline, hotel, operator…" />
                  </label>

                  <label className="field">
                    <span>Confirmation / reference</span>
                    <input name="reference" maxLength={100} />
                  </label>

                  <label className="field">
                    <span>Location</span>
                    <input name="location" maxLength={160} />
                  </label>

                  <label className="field">
                    <span>Reference amount ({space.currency})</span>
                    <input name="amount" type="number" min="0" step="0.01" placeholder="Optional" />
                  </label>

                  <label className="field">
                    <span>Note</span>
                    <textarea name="note" rows={2} maxLength={500} />
                  </label>

                  <button className="button primary" disabled={Boolean(busy)}>
                    Save Booking
                  </button>
                </form>
              </details>
            )}

            {!bookings.length ? (
              <div className="notice">
                <strong>No Trip Bookings yet.</strong>{' '}
                Save confirmed flights, hotels and activities here.
              </div>
            ) : (
              <div className="trip-planning-list">
                {bookings.map((booking) => (
                  <article className="trip-planning-card" key={booking.id}>
                    <div>
                      <span className="eyebrow">{booking.bookingType}</span>
                      <strong>{booking.title}</strong>
                      <small>
                        {booking.date}
                        {booking.time ? ` · ${booking.time}` : ''}
                        {booking.provider ? ` · ${booking.provider}` : ''}
                      </small>

                      {booking.location && <small>{booking.location}</small>}
                      {booking.reference && <small>Ref: {booking.reference}</small>}

                      {booking.amountMinor != null && (
                        <small>
                          Reference amount:{' '}
                          {formatMoney(
                            booking.amountMinor,
                            booking.currency || space.currency,
                          )}
                        </small>
                      )}

                      {booking.note && <p>{booking.note}</p>}
                    </div>

                    {canPlan && (
                      <button
                        type="button"
                        className="button secondary compact"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          setArchiveRequest({
                            kind: 'booking',
                            id: booking.id,
                            title: booking.title,
                          })
                        }
                      >
                        Archive
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}