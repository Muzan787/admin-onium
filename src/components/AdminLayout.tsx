import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Package, Image, ShoppingBag, LogOut, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-900 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">ONIUM Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 bg-white shadow-md min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-2">
            <Link
              to="/admin/dashboard"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive('/admin/dashboard')
                  ? 'bg-slate-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Package className="w-5 h-5" />
              Dashboard
            </Link>

            <Link
              to="/admin/products"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive('/admin/dashboard')
                  ? 'bg-slate-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Package className="w-5 h-5" />
              Products
            </Link>

            <Link
              to="/admin/deals"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive('/admin/deals')
                  ? 'bg-slate-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Image className="w-5 h-5" />
              Deals
            </Link>

            <Link
              to="/admin/orders"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive('/admin/orders')
                  ? 'bg-slate-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              Orders
            </Link>

            <Link
              to="/admin/reviews"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive('/admin/reviews') ? 'bg-slate-900 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Star className="w-5 h-5" />
              Reviews
            </Link>

          </nav>
        </aside>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
