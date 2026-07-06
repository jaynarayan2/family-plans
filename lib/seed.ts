import { AppState, CalEvent, BacklogItem } from './types';

function iso(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

let n = 0;
const id = (p: string) => `${p}_seed${n++}`;

// Sample data so the app is alive on first open. Everyone can edit/delete.
export function seedState(): AppState {
  const events: CalEvent[] = [
    {
      id: id('e'),
      title: 'Costco run',
      category: 'shopping',
      owner: 'shared',
      participants: ['Dad', 'Mum'],
      day: iso(0),
      start: '10:00',
      durationMin: 90,
      fixed: false,
      status: 'confirmed',
      votes: { Dad: 'yes', Mum: 'yes' },
      location: 'Costco Downsview',
      notes: 'Need paper towels, chicken, fruit',
      createdBy: 'Dad',
      createdAt: Date.now(),
    },
    {
      id: id('e'),
      title: 'Afternoon nap',
      category: 'nap',
      owner: 'Jay',
      participants: ['Jay'],
      day: iso(0),
      start: '15:00',
      durationMin: 60,
      fixed: false,
      status: 'confirmed',
      votes: {},
      createdBy: 'Jay',
      createdAt: Date.now(),
    },
    {
      id: id('e'),
      title: 'Dentist (Mum)',
      category: 'errand',
      owner: 'Mum',
      participants: ['Mum'],
      day: iso(1),
      start: '09:30',
      durationMin: 45,
      fixed: true, // fixed appointment — cannot move
      status: 'confirmed',
      votes: {},
      location: 'Dr. Lee, King St W',
      createdBy: 'Mum',
      createdAt: Date.now(),
    },
    {
      id: id('e'),
      title: 'Family dinner — Italian?',
      category: 'dinner',
      owner: 'shared',
      participants: ['Reena', 'Mum', 'Dad', 'Jay'],
      day: iso(1),
      start: '19:00',
      durationMin: 90,
      fixed: false,
      status: 'pending', // needs votes / confirmation
      votes: { Reena: 'yes', Jay: 'yes' },
      notes: 'Cuisine TBD — use the Eat tab to get picks near home',
      createdBy: 'Reena',
      createdAt: Date.now(),
    },
    {
      id: id('e'),
      title: 'Eaton Centre trip',
      category: 'mall',
      owner: 'shared',
      participants: ['Reena', 'Jay'],
      day: iso(2),
      start: '13:00',
      durationMin: 150,
      fixed: false,
      status: 'pending',
      votes: { Reena: 'yes' },
      createdBy: 'Reena',
      createdAt: Date.now(),
    },
  ];

  const backlog: BacklogItem[] = [
    {
      id: id('b'),
      title: 'Toronto Islands day trip',
      category: 'travel',
      owner: 'shared',
      participants: ['Reena', 'Mum', 'Dad', 'Jay'],
      durationMin: 240,
      notes: 'Ferry from Jack Layton terminal',
      createdBy: 'Jay',
      createdAt: Date.now(),
    },
    {
      id: id('b'),
      title: 'Try new ramen place',
      category: 'dinner',
      owner: 'shared',
      participants: ['Jay', 'Reena'],
      durationMin: 75,
      createdBy: 'Reena',
      createdAt: Date.now(),
    },
    {
      id: id('b'),
      title: 'Groceries — No Frills',
      category: 'shopping',
      owner: 'Dad',
      participants: ['Dad'],
      durationMin: 45,
      createdBy: 'Dad',
      createdAt: Date.now(),
    },
  ];

  return { events, backlog, notifications: [], version: 1 };
}
