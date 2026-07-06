'use client';

import { useCallback, useEffect, useState } from 'react';
import { BacklogItem, CalEvent, UserName } from '@/lib/types';
import { USER_CONFIG } from '@/lib/users';
import { useStore } from '@/lib/store';
import { todayISO } from '@/lib/dates';
import { Splash } from '@/components/Splash';
import { Gate } from '@/components/Gate';
import { Account } from '@/components/Account';
import { DayStrip, DayView, WeekView } from '@/components/CalendarViews';
import { EventEditor } from '@/components/EventEditor';
import { Backlog } from '@/components/Backlog';
import { CuisineFinder, ActivityFinder } from '@/components/Finders';
import { Notifications, unreadCount } from '@/components/Notifications';
import { HomeSummary } from '@/components/HomeSummary';
import { NeedsYou } from '@/components/NeedsYou';
import { involvesMe } from '@/lib/selectors';
import { Avatar } from '@/components/ui';

type Tab = 'plans' | 'backlog' | 'eat' | 'do';
type Lens = 'all' | 'mine';

export default function Home() {
  const [me, setMe] = useState<UserName | null>(null);
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [tab, setTab] = useState<Tab>('plans');
  const [calMode, setCalMode] = useState<'day' | 'week'>('day');
  const [lens, setLens] = useState<Lens>('all');
  const [selectedDay, setSelectedDay] = useState(todayISO());

  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [newAt, setNewAt] = useState<{ day: string; start?: string } | null>(null);
  const [assignItem, setAssignItem] = useState<BacklogItem | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [needsOpen, setNeedsOpen] = useState(false);

  const onUnauthorized = useCallback(() => {
    setAuthed(false);
    setMe(null);
    setShowSplash(true);
  }, []);

  const { state, dispatch } = useStore(authed, onUnauthorized);

  // Check for an existing session on load.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'status' }),
        });
        const data = await res.json();
        if (data.authedUser) {
          setMe(data.authedUser);
          setAuthed(true);
        }
      } catch {}
      setAuthChecked(true);
    })();
  }, []);

  const unread = me ? unreadCount(state, me) : 0;

  function onAuthed(u: UserName) {
    setMe(u);
    setAuthed(true);
    setShowSplash(true);
  }

  function openNew(day: string, start?: string) {
    setEditing(null);
    setNewAt({ day, start });
    setEditorOpen(true);
  }

  function openEdit(ev: CalEvent) {
    setEditing(ev);
    setNewAt(null);
    setEditorOpen(true);
  }

  function scheduleFromBacklog(item: BacklogItem) {
    setAssignItem(item);
    setTab('plans');
    setCalMode('day');
  }

  if (!authChecked) {
    return <div className="fixed inset-0 bg-ink" />;
  }

  if (!authed || !me) {
    return <Gate onAuthed={onAuthed} />;
  }

  if (showSplash) {
    return <Splash user={me} onPick={() => {}} onEnter={() => setShowSplash(false)} />;
  }

  const c = USER_CONFIG[me];
  const viewState =
    lens === 'mine'
      ? { ...state, events: state.events.filter((e) => involvesMe(e, me)) }
      : state;

  return (
    <div className="min-h-screen max-w-md mx-auto relative">
      {/* Sticky top chrome: header + calendar controls + date strip */}
      <div className="sticky top-0 z-30 bg-[#f4f5fb]/95 backdrop-blur shadow-[0_2px_10px_-8px_rgba(0,0,0,0.3)]">
      <header className="px-4 pt-3 pb-2 flex items-center gap-3">
        <button onClick={() => setAccountOpen(true)} className="flex items-center gap-2">
          <Avatar user={me} size={34} />
        </button>
        <div className="flex-1">
          <div className="text-[12px] text-slate-400 leading-none">Family Plans</div>
          <div className="font-extrabold text-[17px] leading-tight">Hi {me} {c.emoji}</div>
        </div>
        <button
          onClick={() => setNotifOpen(true)}
          className="relative w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-lg"
        >
          🔔
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      </header>

      {/* Calendar controls */}
      {tab === 'plans' && (
        <div className="px-4 pt-1 flex items-center justify-between gap-2">
          <div className="flex gap-1 bg-white rounded-full p-1 shadow-sm w-max">
            {(['day', 'week'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setCalMode(m)}
                className={`px-4 py-1.5 rounded-full text-[14px] font-semibold capitalize ${
                  calMode === m ? 'bg-ink text-white' : 'text-slate-500'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-white rounded-full p-1 shadow-sm w-max">
            {(['all', 'mine'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLens(l)}
                className={`px-3 py-1.5 rounded-full text-[13px] font-semibold ${
                  lens === l ? 'text-white' : 'text-slate-500'
                }`}
                style={lens === l ? { background: lens === 'mine' ? c.color : '#1a1a2e' } : {}}
              >
                {l === 'all' ? 'Everyone' : 'Mine'}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'plans' && calMode === 'day' && (
        <DayStrip selected={selectedDay} onSelect={setSelectedDay} />
      )}
      <div className="pb-1" />
      </div>

      {/* Body */}
      <main>
        {tab === 'plans' && (
          <HomeSummary state={state} me={me} onOpenNeeds={() => setNeedsOpen(true)} />
        )}
        {tab === 'plans' && calMode === 'day' && (
          <DayView
            state={viewState}
            me={me}
            dispatch={dispatch}
            day={selectedDay}
            onEdit={openEdit}
            onNewAt={openNew}
            assignItem={assignItem}
            onPlaced={() => setAssignItem(null)}
          />
        )}
        {tab === 'plans' && calMode === 'week' && (
          <WeekView
            state={viewState}
            me={me}
            dispatch={dispatch}
            anchor={selectedDay}
            onEdit={openEdit}
            onPickDay={(d) => {
              setSelectedDay(d);
              setCalMode('day');
            }}
            onAnchorChange={setSelectedDay}
          />
        )}
        {tab === 'backlog' && (
          <Backlog state={state} me={me} dispatch={dispatch} onSchedule={scheduleFromBacklog} />
        )}
        {tab === 'eat' && <CuisineFinder me={me} dispatch={dispatch} />}
        {tab === 'do' && <ActivityFinder me={me} dispatch={dispatch} />}
      </main>

      {/* Floating add button */}
      {tab === 'plans' && !assignItem && (
        <button
          onClick={() => openNew(selectedDay)}
          className="fixed bottom-24 z-30 w-14 h-14 rounded-full bg-ink text-white text-3xl shadow-lg flex items-center justify-center active:scale-90 transition"
          style={{ right: 'max(1rem, calc(50% - 13rem))' }}
        >
          +
        </button>
      )}
      {assignItem && (
        <button
          onClick={() => setAssignItem(null)}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 bg-rose-500 text-white px-4 py-2.5 rounded-full font-semibold text-[14px] shadow-lg"
        >
          Cancel placing ✕
        </button>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 max-w-md mx-auto bg-white border-t border-slate-100 flex">
        {([
          ['plans', '📅', 'Plans'],
          ['backlog', '💡', 'Backlog'],
          ['eat', '🍽️', 'Eat'],
          ['do', '🎟️', 'Do'],
        ] as [Tab, string, string][]).map(([t, icon, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 ${
              tab === t ? 'text-ink' : 'text-slate-400'
            }`}
          >
            <span className="text-xl">{icon}</span>
            <span className="text-[11px] font-semibold">{label}</span>
          </button>
        ))}
      </nav>

      {/* Overlays */}
      {editorOpen && (
        <EventEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          me={me}
          dispatch={dispatch}
          existing={editing ? state.events.find((e) => e.id === editing.id) ?? editing : null}
          defaultDay={newAt?.day ?? selectedDay}
          defaultStart={newAt?.start}
        />
      )}
      <Notifications
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        state={state}
        me={me}
        dispatch={dispatch}
      />
      <NeedsYou
        open={needsOpen}
        onClose={() => setNeedsOpen(false)}
        state={state}
        me={me}
        dispatch={dispatch}
        onEdit={(ev) => {
          setNeedsOpen(false);
          openEdit(ev);
        }}
      />
      <Account
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        me={me}
        dispatch={dispatch}
        onLoggedOut={() => {
          setAccountOpen(false);
          setAuthed(false);
          setMe(null);
          setShowSplash(true);
        }}
      />
    </div>
  );
}
