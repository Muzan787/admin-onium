import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Package, Image, ShoppingBag, LogOut, Star, LayoutDashboard, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

const handleSignOut = () => { // Removed 'async'
    signOut(); // No 'await' needed anymore
    navigate('/login');
  };

  // Helper to check if a link is active
  // We check if the pathname starts with the link, or if it's exact for root
  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Helper class for sidebar links
  const linkClass = (path: string) => 
    `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
      isActive(path)
        ? 'bg-slate-900 text-white'
        : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">ONIUM Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300 hidden sm:inline">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md min-h-[calc(100vh-73px)] hidden md:block fixed left-0 top-[73px] bottom-0 overflow-y-auto">
          <nav className="p-4 space-y-2">
            <Link to="/" className={linkClass('/')}>
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </Link>

            <Link to="/products" className={linkClass('/products')}>
              <Package className="w-5 h-5" />
              Products
            </Link>

            <Link to="/deals" className={linkClass('/deals')}>
              <Image className="w-5 h-5" />
              Deals
            </Link>

            <Link to="/orders" className={linkClass('/orders')}>
              <ShoppingBag className="w-5 h-5" />
              Orders
            </Link>

            <Link to="/customers" className={linkClass('/customers')}>
              <Users className="w-5 h-5" />
              Customers
            </Link>

            <Link to="/reviews" className={linkClass('/reviews')}>
              <Star className="w-5 h-5" />
              Reviews
            </Link>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 md:ml-64">
          <Outlet />
        </main>
      </div>
    </div>
  );
}