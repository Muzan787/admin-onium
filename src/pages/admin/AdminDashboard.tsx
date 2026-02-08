import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  DollarSign, ShoppingBag, AlertTriangle, 
  ArrowRight, Calendar, Star, Package 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingReviews: 0,
    lowStockCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Threshold for "Low Stock" warning
  const LOW_STOCK_THRESHOLD = 5;

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

      // 2. Fetch All Products (for Stock & Top Selling calc)
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*');
      if (productsError) throw productsError;

      // 3. Fetch Order Items (to calculate sales)
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_title, quantity, price_at_purchase');
      if (itemsError) throw itemsError;

      // 4. Fetch Pending Reviews Count
      const { count: reviewCount, error: reviewError } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false);
      if (reviewError) throw reviewError;

      // --- Process Data ---
      
      // A. Basic Stats
      const totalRevenue = (orders || []).reduce((sum, order) => sum + (order.total_price || 0), 0);
      const totalOrders = (orders || []).length;
      
      // B. Low Stock Items
      const lowStock = (products || [])
        .filter(p => p.stock <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.stock - b.stock) // Lowest stock first
        .slice(0, 5); // Show top 5

      // C. Top Selling Products
      const productSales: Record<string, any> = {};
      (orderItems || []).forEach(item => {
        if (!productSales[item.product_title]) {
          productSales[item.product_title] = { name: item.product_title, sales: 0, revenue: 0 };
        }
        productSales[item.product_title].sales += item.quantity;
        productSales[item.product_title].revenue += item.quantity * item.price_at_purchase;
      });

      const topProductsList = Object.values(productSales)
        .sort((a: any, b: any) => b.sales - a.sales)
        .slice(0, 5);

      setStats({
        totalRevenue,
        totalOrders,
        pendingReviews: reviewCount || 0,
        lowStockCount: (products || []).filter(p => p.stock <= LOW_STOCK_THRESHOLD).length,
      });

      setRecentOrders([...(orders || [])].reverse().slice(0, 5));
      setLowStockItems(lowStock);
      setTopProducts(topProductsList);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, link, linkText }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <span className="text-2xl font-bold text-slate-900">{value}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {link && (
          <Link to={link} className="text-xs font-bold text-slate-900 mt-2 inline-flex items-center gap-1 hover:underline">
            {linkText} <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex justify-center items-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Overview</h1>
          <p className="text-slate-500">Here is what's happening with your store today.</p>
        </div>
        <div className="text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
          <Calendar className="w-4 h-4" /> 
          {format(new Date(), 'dd MMM, yyyy')}
        </div>
      </div>

      {/* 1. Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`Rs${stats.totalRevenue.toLocaleString()}`} 
          icon={DollarSign} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Total Orders" 
          value={stats.totalOrders} 
          icon={ShoppingBag} 
          color="bg-blue-500" 
          link="/orders"
          linkText="View Orders"
        />
        <StatCard 
          title="Pending Reviews" 
          value={stats.pendingReviews} 
          icon={Star} 
          color="bg-amber-500" 
          link="/reviews"
          linkText="Approve Reviews"
        />
        <StatCard 
          title="Low Stock Items" 
          value={stats.lowStockCount} 
          icon={AlertTriangle} 
          color="bg-red-500" 
          link="/products"
          linkText="Update Stock"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* 2. Low Stock Alerts (Actionable) */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-red-50/30">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Low Stock Alerts
            </h2>
            <Link to="/products" className="text-xs font-bold text-red-600 hover:text-red-700">Manage Stock</Link>
          </div>
          <div className="flex-1">
            {lowStockItems.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                        <p className="text-xs text-slate-500">Price: Rs{item.price}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {item.stock} remaining
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                All stock levels look good!
              </div>
            )}
          </div>
        </div>

        {/* 3. Top Performing Products (Insight) */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 bg-emerald-50/30">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Best Sellers
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {topProducts.map((product, index) => (
              <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div className="flex items-center gap-4">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}
                  `}>
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.sales} units sold</p>
                  </div>
                </div>
                <p className="font-bold text-slate-900 text-sm">Rs{product.revenue.toLocaleString()}</p>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">No sales data recorded yet.</div>
            )}
          </div>
        </div>

      </div>

      {/* 4. Recent Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Latest Transactions</h2>
          <Link to="/orders" className="text-slate-600 text-sm font-bold hover:text-slate-900 flex items-center gap-1">
            View All Orders <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-mono text-slate-500">#{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{order.customer_name}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">Rs{order.total_price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                      ${order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 
                        order.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}
                    `}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}