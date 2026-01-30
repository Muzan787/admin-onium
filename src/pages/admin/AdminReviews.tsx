import { useEffect, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { supabase, type Review } from '../../lib/supabase';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    setReviews(data || []);
  };

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    await supabase.from('reviews').update({ is_approved: !currentStatus }).eq('id', id);
    fetchReviews();
  };

  const deleteReview = async (id: string) => {
    if (confirm('Delete this review?')) {
      await supabase.from('reviews').delete().eq('id', id);
      fetchReviews();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Manage Reviews</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Rating</th>
              <th className="px-6 py-3">Comment</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reviews.map(review => (
              <tr key={review.id}>
                <td className="px-6 py-4 font-medium">{review.customer_name}</td>
                <td className="px-6 py-4">{review.rating} Stars</td>
                <td className="px-6 py-4 max-w-xs truncate">{review.comment}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${review.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {review.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => toggleApproval(review.id, review.is_approved)} className="text-blue-600 hover:text-blue-900">
                    <Check size={20} />
                  </button>
                  <button onClick={() => deleteReview(review.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}