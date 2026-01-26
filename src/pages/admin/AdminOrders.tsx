import { useEffect, useState } from 'react';
import { supabase, Order, OrderItem } from '../../lib/supabase';
import { CreditCard, Banknote, Truck, AlertCircle, Printer, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

          return {
            ...order,
            order_items: items || [],
          };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      fetchOrders();
      toast.success(`Order status updated to ${status}`);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order status');
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
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Orders Management</h2>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                    <div className="text-sm text-gray-500">{order.customer_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-700 capitalize">
                      {order.payment_method === 'card' ? (
                        <CreditCard className="w-4 h-4 text-purple-500" />
                      ) : (
                        <Banknote className="w-4 h-4 text-green-500" />
                      )}
                      {order.payment_method === 'cod' ? 'COD' : order.payment_method}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.order_items.reduce((sum, item) => sum + item.quantity, 0)} items
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    Rs{order.total_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize cursor-pointer border-0 ring-1 ring-inset ${getStatusColor(order.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-primary-600 hover:text-primary-900 font-semibold"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12 bg-gray-50">
            <p className="text-gray-500">No orders found.</p>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 md:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Order Details</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    ID: <span className="font-mono">{selectedOrder.id}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* NEW: Print Button */}
                  <button
                    onClick={() => handlePrintInvoice(selectedOrder)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Print Invoice
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Customer Details */}
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-primary-500 rounded-full"></div>
                      Customer Information
                    </h4>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm border border-gray-100">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name:</span>
                        <span className="font-medium text-gray-900">{selectedOrder.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-medium text-gray-900">{selectedOrder.customer_email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone:</span>
                        <span className="font-medium text-gray-900">{selectedOrder.customer_phone}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-secondary-500 rounded-full"></div>
                      Shipping & Payment
                    </h4>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm border border-gray-100">
                      <div>
                        <span className="text-gray-500 block mb-1">Address:</span>
                        <span className="font-medium text-gray-900 block bg-white p-2 rounded border border-gray-200">
                          {selectedOrder.customer_address}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-gray-500">Payment Method:</span>
                        <span className="font-bold text-gray-900 capitalize px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm">
                          {selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : selectedOrder.payment_method}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedOrder.special_instructions && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        Special Instructions
                      </h4>
                      <div className="bg-orange-50 text-orange-800 rounded-xl p-4 text-sm border border-orange-100 italic">
                        "{selectedOrder.special_instructions}"
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Items & Totals */}
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                      Order Items
                    </h4>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-[300px] overflow-y-auto">
                      <div className="space-y-4">
                        {selectedOrder.order_items.map((item) => (
                          <div key={item.id} className="flex justify-between items-start pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                            <div>
                              <p className="font-semibold text-gray-900">{item.product_title}</p>
                              <p className="text-xs text-gray-500 mt-1">Quantity: {item.quantity}</p>
                            </div>
                            <p className="font-medium text-gray-900">
                              Rs{(item.price_at_purchase * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Payment Summary</h4>
                    <div className="bg-slate-900 text-white rounded-xl p-5 space-y-3">
                      <div className="flex justify-between text-slate-300 text-sm">
                        <span>Subtotal</span>
                        <span>Rs{selectedOrder.subtotal_price?.toFixed(2) || (selectedOrder.total_price - (selectedOrder.shipping_charge || 0)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300 text-sm">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          <span>Delivery Charge</span>
                        </div>
                        <span>Rs{selectedOrder.shipping_charge?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                        <span className="font-bold text-lg">Total Amount</span>
                        <span className="font-bold text-2xl text-green-400">Rs{selectedOrder.total_price.toFixed(2)}</span>
                      </div>
                    </div>
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