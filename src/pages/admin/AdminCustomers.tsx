import { useEffect, useState } from 'react';
import { supabase, type Order } from '../../lib/supabase';
import { 
  Search, Mail, Phone, Users, ShoppingBag, 
  Eye, X, Calendar, CreditCard, TrendingUp 
} from 'lucide-react';

interface CustomerProfile {
  email: string;
  name: string;
  phone: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  orders: Order[]; // Store full order history
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerProfile[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Filter logic
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(lowerTerm) || 
      c.email.toLowerCase().includes(lowerTerm) ||
      c.phone.includes(lowerTerm)
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    try {
      // Fetch all orders to aggregate customer data
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by unique email
      const customerMap = new Map<string, CustomerProfile>();

      (orders || []).forEach((order: Order) => {
        const email = order.customer_email.toLowerCase();
        
        if (!customerMap.has(email)) {
          // Initialize new customer profile
          customerMap.set(email, {
            email: order.customer_email,
            name: order.customer_name,
            phone: order.customer_phone,
            address: order.customer_address,
            totalOrders: 0,
            totalSpent: 0,
            lastOrderDate: order.created_at,
            orders: [] // Initialize empty order array
          });
        }

        // Update stats
        const customer = customerMap.get(email)!;
        customer.totalOrders += 1;
        customer.totalSpent += order.total_price || 0;
        customer.orders.push(order); // Add order to history
        
        // Keep most recent contact details
        if (new Date(order.created_at) > new Date(customer.lastOrderDate)) {
           customer.name = order.customer_name;
           customer.phone = order.customer_phone;
           customer.address = order.customer_address;
           customer.lastOrderDate = order.created_at;
        }
      });

      const uniqueCustomers = Array.from(customerMap.values());
      setCustomers(uniqueCustomers);
      setFilteredCustomers(uniqueCustomers);

    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
          <p className="text-sm text-gray-500">{customers.length} unique customers found</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search customers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase">Stats</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase">Total Spent</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading customer profiles...</td></tr>
              ) : filteredCustomers.map((customer, index) => (
                <tr key={index} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{customer.name}</div>
                        <div className="text-xs text-gray-500">{new Date(customer.lastOrderDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-gray-600">
                      <div className="flex items-center gap-2"><Mail size={12} /> {customer.email}</div>
                      <div className="flex items-center gap-2"><Phone size={12} /> {customer.phone || '-'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      <ShoppingBag size={10} /> {customer.totalOrders} orders
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-600">
                    Rs{customer.totalSpent.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedCustomer(customer)}
                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-lg transition"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredCustomers.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
             <div className="p-6 md:p-8">
               {/* Modal Header */}
               <div className="flex justify-between items-start mb-8">
                 <div className="flex items-center gap-4">
                   <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl text-slate-700 font-bold border border-slate-200">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                   </div>
                   <div>
                     <h3 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h3>
                     <p className="text-slate-500 flex items-center gap-2 text-sm">
                       <Mail size={14} /> {selectedCustomer.email}
                     </p>
                   </div>
                 </div>
                 <button 
                   onClick={() => setSelectedCustomer(null)} 
                   className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
                 >
                   <X size={24} />
                 </button>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                 <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                   <div className="text-emerald-600 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                     <CreditCard size={14} /> Lifetime Spend
                   </div>
                   <div className="text-2xl font-bold text-emerald-700">Rs{selectedCustomer.totalSpent.toLocaleString()}</div>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                   <div className="text-blue-600 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                     <ShoppingBag size={14} /> Total Orders
                   </div>
                   <div className="text-2xl font-bold text-blue-700">{selectedCustomer.totalOrders}</div>
                 </div>
                 <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                   <div className="text-purple-600 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                     <TrendingUp size={14} /> Avg. Order Value
                   </div>
                   <div className="text-2xl font-bold text-purple-700">
                     Rs{Math.round(selectedCustomer.totalSpent / selectedCustomer.totalOrders).toLocaleString()}
                   </div>
                 </div>
               </div>

               <div className="grid md:grid-cols-3 gap-8">
                 {/* Contact Details Column */}
                 <div className="md:col-span-1 space-y-6">
                   <div>
                     <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                       <Users size={18} /> Contact Info
                     </h4>
                     <div className="bg-slate-50 p-4 rounded-xl text-sm space-y-3 border border-slate-100">
                       <div>
                         <label className="text-xs text-slate-400 font-bold uppercase">Phone</label>
                         <p className="font-medium text-slate-700">{selectedCustomer.phone || 'N/A'}</p>
                       </div>
                       <div>
                         <label className="text-xs text-slate-400 font-bold uppercase">Address</label>
                         <p className="font-medium text-slate-700 leading-relaxed">{selectedCustomer.address}</p>
                       </div>
                       <div>
                         <label className="text-xs text-slate-400 font-bold uppercase">Last Active</label>
                         <p className="font-medium text-slate-700">
                           {new Date(selectedCustomer.lastOrderDate).toLocaleDateString()}
                         </p>
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Order History Column */}
                 <div className="md:col-span-2">
                   <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                     <Calendar size={18} /> Order History
                   </h4>
                   <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                     <table className="w-full text-sm text-left">
                       <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                         <tr>
                           <th className="px-4 py-3">Order ID</th>
                           <th className="px-4 py-3">Date</th>
                           <th className="px-4 py-3">Total</th>
                           <th className="px-4 py-3 text-right">Status</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {selectedCustomer.orders.map(order => (
                           <tr key={order.id} className="hover:bg-slate-50">
                             <td className="px-4 py-3 font-mono text-xs">#{order.id.slice(0, 8).toUpperCase()}</td>
                             <td className="px-4 py-3 text-slate-600">{new Date(order.created_at).toLocaleDateString()}</td>
                             <td className="px-4 py-3 font-medium">Rs{order.total_price.toLocaleString()}</td>
                             <td className="px-4 py-3 text-right">
                               <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(order.status)}`}>
                                 {order.status}
                               </span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               </div>

             </div>
          </div>
        </div>
      )}
    </div>
  );
}