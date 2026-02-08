import { useEffect, useState } from 'react';
import { supabase, type Order, type OrderItem } from '../../lib/supabase';
import { 
  CreditCard, Banknote, Truck, AlertCircle, Printer, X, 
  Search, Filter, ChevronLeft, ChevronRight, CheckSquare, Square 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export default function AdminOrders() {
  // --- State ---
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchOrders();
    // Reset selection on page change or filter change
    setSelectedIds([]); 
  }, [page, statusFilter, searchQuery]); // Re-fetch when these change

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // 1. Build Query
      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // 2. Apply Filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery) {
        // Search by ID or Customer Name (Case Insensitive)
        query = query.or(`id.eq.${searchQuery},customer_name.ilike.%${searchQuery}%`);
      }

      // 3. Apply Pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      // 4. Fetch Items for these specific orders (Avoid fetching ALL items)
      const ordersWithItems = await Promise.all(
        (data || []).map(async (order) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

          return { ...order, order_items: items || [] };
        })
      );

      setOrders(ordersWithItems);
      setTotalOrders(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));

    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Bulk Actions ---
  const toggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]); // Deselect all
    } else {
      setSelectedIds(orders.map(o => o.id)); // Select all on current page
    }
  };

  const toggleSelectOrder = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (!confirm(`Mark ${selectedIds.length} orders as ${newStatus}?`)) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .in('id', selectedIds);

      if (error) throw error;
      
      toast.success('Bulk update successful');
      fetchOrders();
      setSelectedIds([]);
    } catch (error) {
      console.error(error);
      toast.error('Bulk update failed');
    }
  };

  // --- Single Actions ---
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) throw error;
      
      // Optimistic Update (Instant UI feedback)
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
      toast.success(`Order updated to ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handlePrintInvoice = (order: OrderWithItems) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print invoices');
      return;
    }

    const subtotal = order.subtotal_price || (order.total_price - (order.shipping_charge || 0));
    const shipping = order.shipping_charge || 0;

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${order.id.slice(0, 8).toUpperCase()} - Onium</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1f2937; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; }
          .logo { font-size: 28px; font-weight: 800; color: #059669; letter-spacing: -1px; margin: 0; }
          .invoice-tag { font-size: 14px; text-transform: uppercase; color: #6b7280; letter-spacing: 2px; font-weight: 600; margin-top: 5px; }
          .meta-group { text-align: right; }
          .meta-item { margin-bottom: 4px; font-size: 14px; }
          .meta-label { color: #6b7280; font-weight: 500; margin-right: 8px; }
          .meta-value { font-weight: 600; }
          
          .grid { display: flex; gap: 40px; margin-bottom: 40px; }
          .col { flex: 1; }
          .section-title { font-size: 12px; text-transform: uppercase; color: #9ca3af; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px; }
          .address-box { background: #f9fafb; padding: 15px; border-radius: 8px; font-size: 14px; line-height: 1.6; }
          .address-name { font-weight: 700; font-size: 16px; margin-bottom: 4px; display: block; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { text-align: left; padding: 12px 0; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 700; }
          td { padding: 16px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
          .text-right { text-align: right; }
          .item-name { font-weight: 600; color: #111827; }
          .item-qty { color: #6b7280; font-size: 13px; }
          
          .totals { width: 300px; margin-left: auto; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
          .total-row.final { border-top: 2px solid #111827; margin-top: 10px; padding-top: 15px; font-weight: 800; font-size: 18px; }
          
          .footer { margin-top: 60px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #f3f4f6; padding-top: 30px; }
          
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="logo">ONIUM.</h1>
            <div class="invoice-tag">Packing Slip / Invoice</div>
          </div>
          <div class="meta-group">
            <div class="meta-item"><span class="meta-label">Order ID:</span> <span class="meta-value">#${order.id.slice(0, 8).toUpperCase()}</span></div>
            <div class="meta-item"><span class="meta-label">Date:</span> <span class="meta-value">${new Date(order.created_at).toLocaleDateString()}</span></div>
            <div class="meta-item"><span class="meta-label">Payment:</span> <span class="meta-value" style="text-transform: capitalize;">${order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}</span></div>
          </div>
        </div>

        <div class="grid">
          <div class="col">
            <div class="section-title">Billed To</div>
            <div class="address-box">
              <span class="address-name">${order.customer_name}</span>
              ${order.customer_email}<br>
              ${order.customer_phone}
            </div>
          </div>
          <div class="col">
            <div class="section-title">Shipped To</div>
            <div class="address-box">
              <span class="address-name">${order.customer_name}</span>
              ${order.customer_address}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="50%">Item</th>
              <th width="15%" class="text-right">Price</th>
              <th width="15%" class="text-right">Qty</th>
              <th width="20%" class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.order_items.map(item => `
              <tr>
                <td>
                  <div class="item-name">${item.product_title}</div>
                </td>
                <td class="text-right">Rs${item.price_at_purchase.toLocaleString()}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">Rs${(item.price_at_purchase * item.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>Rs${subtotal.toLocaleString()}</span>
          </div>
          <div class="total-row">
            <span>Shipping</span>
            <span>Rs${shipping.toLocaleString()}</span>
          </div>
          <div class="total-row final">
            <span>Total</span>
            <span>Rs${order.total_price.toLocaleString()}</span>
          </div>
        </div>

        ${order.special_instructions ? `
          <div style="margin-top: 40px; background: #fffbeb; padding: 15px; border-radius: 8px; border: 1px solid #fcd34d;">
            <div class="section-title" style="color: #92400e; margin-bottom: 5px;">Special Instructions</div>
            <div style="color: #92400e; font-size: 14px;">${order.special_instructions}</div>
          </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for choosing Onium! If you have any questions, contact us at +92 323 1550147.</p>
          <p>Islamabad, Pakistan</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders Management</h2>
          <p className="text-sm text-gray-500">{totalOrders} total orders found</p>
        </div>
        
        {/* Bulk Actions Toolbar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg animate-fade-in">
            <span className="text-sm font-bold">{selectedIds.length} selected</span>
            <div className="h-4 w-px bg-slate-700 mx-2"></div>
            <button onClick={() => handleBulkStatusUpdate('processing')} className="text-xs hover:text-blue-300 font-medium">Mark Processing</button>
            <button onClick={() => handleBulkStatusUpdate('shipped')} className="text-xs hover:text-purple-300 font-medium">Mark Shipped</button>
            <button onClick={() => handleBulkStatusUpdate('delivered')} className="text-xs hover:text-green-300 font-medium">Mark Delivered</button>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by Order ID or Customer Name..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400 w-4 h-4" />
          <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 w-10">
                  <button onClick={toggleSelectAll} className="flex items-center">
                    {selectedIds.length === orders.length && orders.length > 0 ? 
                      <CheckSquare className="w-5 h-5 text-slate-900" /> : 
                      <Square className="w-5 h-5 text-gray-400" />
                    }
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Order</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Items</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Total</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading orders...</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(order.id) ? 'bg-slate-50' : ''}`}>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleSelectOrder(order.id)}>
                      {selectedIds.includes(order.id) ? 
                        <CheckSquare className="w-5 h-5 text-slate-900" /> : 
                        <Square className="w-5 h-5 text-gray-300" />
                      }
                    </button>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">#{order.id.slice(0, 6)}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{order.customer_name}</div>
                    <div className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {order.order_items.length} items
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">Rs{order.total_price.toFixed(0)}</td>
                  <td className="px-6 py-4">
                     <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className={`px-3 py-1 rounded-full text-xs font-bold capitalize cursor-pointer border-0 ring-1 ring-inset focus:ring-2 ${getStatusColor(order.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="text-slate-600 hover:text-slate-900 font-medium text-sm hover:underline"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && orders.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">No orders found matching your criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Page <span className="font-bold text-gray-900">{page}</span> of {totalPages}
          </span>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Order Details Modal (Same as before but cleaner) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
             <div className="p-6">
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <h3 className="text-xl font-bold">Order #{selectedOrder.id.slice(0,8)}</h3>
                   <span className={`text-xs px-2 py-1 rounded-full uppercase font-bold mt-2 inline-block ${getStatusColor(selectedOrder.status)}`}>
                     {selectedOrder.status}
                   </span>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => handlePrintInvoice(selectedOrder)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><Printer size={20} /></button>
                   <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
                 </div>
               </div>

               {/* Add your existing Detail View Layout Here */}
               {/* I've kept the logic wrapper, you can copy-paste the inner detail view from your old file if needed, or use a simplified version */}
               <div className="space-y-6">
                 <div className="grid md:grid-cols-2 gap-6 text-sm">
                   <div className="bg-slate-50 p-4 rounded-xl">
                     <h4 className="font-bold mb-2 flex items-center gap-2"><CreditCard size={14}/> Customer</h4>
                     <p>{selectedOrder.customer_name}</p>
                     <p>{selectedOrder.customer_email}</p>
                     <p>{selectedOrder.customer_phone}</p>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-xl">
                     <h4 className="font-bold mb-2 flex items-center gap-2"><Truck size={14}/> Shipping</h4>
                     <p className="whitespace-pre-wrap">{selectedOrder.customer_address}</p>
                   </div>
                 </div>

                 <div className="border rounded-xl overflow-hidden">
                   <table className="w-full text-sm">
                     <thead className="bg-slate-50 text-left">
                       <tr><th className="p-3">Item</th><th className="p-3 text-right">Total</th></tr>
                     </thead>
                     <tbody className="divide-y">
                       {selectedOrder.order_items.map(item => (
                         <tr key={item.id}>
                           <td className="p-3">
                             <div className="font-medium">{item.product_title}</div>
                             <div className="text-slate-500">x{item.quantity}</div>
                           </td>
                           <td className="p-3 text-right">Rs{(item.price_at_purchase * item.quantity).toFixed(0)}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
                 
                 <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl">
                   <span className="font-bold">Total Amount</span>
                   <span className="text-xl font-bold">Rs{selectedOrder.total_price.toFixed(0)}</span>
                 </div>
               </div>

             </div>
          </div>
        </div>
      )}
    </div>
  );
}