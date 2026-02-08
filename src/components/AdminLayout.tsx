import { useState } from 'react'; // Added useState
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { 
  Package, Image, ShoppingBag, LogOut, Star, 
  LayoutDashboard, Users, Menu, X // Added Menu, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // New State

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Close sidebar when a link is clicked (for mobile)
  const handleLinkClick = () => {
    setIsSidebarOpen(false);
  };

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
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-1 hover:bg-slate-800 rounded transition"
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">ONIUM Admin</h1>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <span className="text-sm text-gray-300 hidden md:inline">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed md:fixed left-0 top-[64px] md:top-[73px] bottom-0 
          w-64 bg-white shadow-md z-40
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:block
          overflow-y-auto
        `}>
          <nav className="p-4 space-y-2">
            {[
              { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
              { path: '/products', icon: Package, label: 'Products' },
              { path: '/deals', icon: Image, label: 'Deals' },
              { path: '/orders', icon: ShoppingBag, label: 'Orders' },
              { path: '/customers', icon: Users, label: 'Customers' },
              { path: '/reviews', icon: Star, label: 'Reviews' },
            ].map((item) => (
              <Link 
                key={item.path} 
                to={item.path} 
                className={linkClass(item.path)}
                onClick={handleLinkClick}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 md:ml-64 w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}