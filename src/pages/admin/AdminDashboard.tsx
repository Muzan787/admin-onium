// src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  DollarSign, ShoppingBag, Package, Clock, 
  CheckCircle, Truck, XCircle, ArrowRight, Calendar 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    productsCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // 2. Fetch Product Count
      const { count, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productsError) throw productsError;

      // --- Process Stats ---
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;

      setStats({
        totalRevenue,
        totalOrders,
        pendingOrders,
        productsCount: count || 0,
      });

      // Show last 5 orders for the list
      setRecentOrders([...(orders || [])].reverse().slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-4 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Overview of your store's performance.</p>
        </div>
        <div className="text-sm font-medium text-slate-400 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Today: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`Rs${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} color="bg-primary-500" />
        <StatCard title="Total Orders" value={stats.totalOrders} icon={ShoppingBag} color="bg-secondary-500" />
        <StatCard title="Pending Orders" value={stats.pendingOrders} icon={Clock} color="bg-accent-500" subtext="Requires attention" />
        <StatCard title="Total Products" value={stats.productsCount} icon={Package} color="bg-slate-500" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Orders List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-primary-600 text-sm font-bold hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                    {order.customer_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{order.customer_name}</p>
                    <p className="text-xs text-slate-500 font-mono">#{order.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">Rs{order.total_price}</p>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && <div className="p-8 text-center text-slate-500">No orders yet.</div>}
          </div>
        </div>

        {/* Quick Stats Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Order Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Delivered</span>
                </div>
                <span className="font-bold text-green-700">{recentOrders.filter(o => o.status === 'delivered').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Shipped</span>
                </div>
                <span className="font-bold text-blue-700">{recentOrders.filter(o => o.status === 'shipped').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-900">Cancelled</span>
                </div>
                <span className="font-bold text-red-700">{recentOrders.filter(o => o.status === 'cancelled').length}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Pro Tip</h3>
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                Regularly update order statuses to keep your customers happy. They can track these updates live!
              </p>
              <Link to="/admin/orders" className="block w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-center font-bold text-sm transition-colors">
                Manage Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}