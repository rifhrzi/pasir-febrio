import { NavLink, useNavigate } from 'react-router-dom';

export default function Layout({ children }) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navClass = ({ isActive }) =>
    [
      'block rounded-xl px-4 py-2 text-sm font-medium transition',
      isActive ? 'bg-white/15 text-white shadow-sm' : 'text-white/60 hover:bg-white/10 hover:text-white'
    ].join(' ');

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-900">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-white/10 bg-slate-950/95 px-6 py-8 text-white">
        <div>
          <p className="text-[10px] uppercase tracking-[0.5em] text-white/40">Pasir</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Finance</h1>
        </div>

        <nav className="mt-10 flex-1 space-y-2 text-sm">
          <NavLink to="/" end className={navClass}>
            Dashboard
          </NavLink>
        </nav>

        <button
          onClick={logout}
          className="mt-auto rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-slate-100 px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
