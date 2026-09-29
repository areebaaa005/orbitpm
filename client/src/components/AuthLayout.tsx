import type { ReactNode } from 'react';
import { Kanban, ListTodo, Radio } from 'lucide-react';
import { OrbitMark } from './OrbitMark';

const FEATURES = [
  { icon: Kanban, text: 'Kanban boards with drag and drop' },
  { icon: ListTodo, text: 'Backlog, sprints and epics in one place' },
  { icon: Radio, text: 'Live updates for your whole team' },
];

/** Split-screen shell for the sign-in / sign-up pages. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-space-950">
      <aside className="hidden w-[44%] max-w-xl flex-col justify-between bg-[#091E42] p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <OrbitMark size={30} />
          <span className="text-lg font-semibold text-white">OrbitPM</span>
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Plan sprints. Ship work.
            <br />
            Keep everyone in sync.
          </h2>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-[#85B8FF]">
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-400">Project management for teams that move fast.</p>
      </aside>
      <main className="flex flex-1 items-center justify-center px-4 py-10">{children}</main>
    </div>
  );
}
