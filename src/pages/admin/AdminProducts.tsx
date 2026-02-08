import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search, Upload, X, Save } from 'lucide-react';
import { supabase, type Product } from '../../lib/supabase';
import toast from 'react-hot-toast';
import axios from 'axios';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// --- Configuration ---
// REPLACE THESE WITH YOUR ACTUAL CLOUDINARY KEYS
const CLOUDINARY_UPLOAD_PRESET = 'OniumProducts'; 
const CLOUDINARY_CLOUD_NAME = 'dztldh7o2';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    discount: '0',
    category: '',
    image_url: '',
    stock: '',
  });

  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Could not load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        uploadData
      );
      setFormData({ ...formData, image_url: response.data.secure_url });
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Image upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const addSpecRow = () => setSpecs([...specs, { key: '', value: '' }]);
  const removeSpecRow = (index: number) => setSpecs(specs.filter((_, i) => i !== index));
  const updateSpec = (index: number, field: 'key' | 'value', newValue: string) => {
    const newSpecs = [...specs];
    newSpecs[index][field] = newValue;
    setSpecs(newSpecs);
  };

  // --- NEW: SLUG GENERATOR ---
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/[\s_-]+/g, '-') // Replace spaces with dashes
      .replace(/^-+|-+$/g, ''); // Trim dashes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const specificationsObject = specs.reduce((acc, curr) => {
        if (curr.key.trim() && curr.value.trim()) {
          acc[curr.key.trim()] = curr.value.trim();
        }
        return acc;
      }, {} as Record<string, any>);

      // Base payload
      const productData: any = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        discount: parseInt(formData.discount) || 0,
        category: formData.category,
        image_url: formData.image_url,
        stock: parseInt(formData.stock),
        specifications: specificationsObject,
      };

      if (editingProduct) {
        // Update existing
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Product updated');
      } else {
        // Create new - MUST GENERATE SLUG
        // We append a timestamp to ensure uniqueness
        const baseSlug = generateSlug(formData.title);
        const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
        
        productData.slug = uniqueSlug;

        const { error } = await supabase.from('products').insert(productData);
        if (error) throw error;
        toast.success('Product created');
      }

      handleCloseModal();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product. ensure fields are valid.');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description || '',
      price: product.price.toString(),
      discount: (product.discount || 0).toString(),
      category: product.category || '',
      image_url: product.image_url || '',
      stock: product.stock.toString(),
    });

    if (product.specifications) {
      const specsArray = Object.entries(product.specifications).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      setSpecs(specsArray);
    } else {
      setSpecs([]);
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Product deleted');
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '', description: '', price: '', discount: '0',
      category: '', image_url: '', stock: '',
    });
    setSpecs([]);
    setEditingProduct(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Products</h2>
          <p className="text-slate-500 text-sm">{products.length} items available</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 w-full md:w-64"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition">
            <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Add Product</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Product</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Category</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Price</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Stock</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
               <tr><td colSpan={5} className="p-8 text-center">Loading...</td></tr>
            ) : filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden">
                      <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="font-semibold text-slate-900">{product.title}</div>
                  </div>
                </td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{product.category}</span></td>
                <td className="px-6 py-4 font-medium">Rs{product.price}</td>
                <td className="px-6 py-4">{product.stock}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleEdit(product)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Product Title</label>
                      <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Price</label>
                        <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2 border rounded-lg outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Discount (%)</label>
                        <input type="number" value={formData.discount} onChange={e => setFormData({...formData, discount: e.target.value})} className="w-full px-4 py-2 border rounded-lg outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Stock</label>
                        <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-4 py-2 border rounded-lg outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
                        <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border rounded-lg outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700">Product Image</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 text-center hover:bg-slate-100 transition relative">
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                      ) : formData.image_url ? (
                        <div className="relative w-full h-48">
                          <img src={formData.image_url} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                          <button 
                            type="button" 
                            onClick={() => setFormData({...formData, image_url: ''})}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-slate-400 mb-2" />
                          <p className="text-sm text-slate-500 mb-2">Click to upload image</p>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder="Or paste image URL..." 
                      value={formData.image_url} 
                      onChange={e => setFormData({...formData, image_url: e.target.value})}
                      className="w-full px-4 py-2 text-sm border rounded-lg text-slate-500"
                    />
                  </div>
                </div>

                {/* Rich Text Description */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                  <div className="bg-white">
                    <ReactQuill 
                      theme="snow" 
                      value={formData.description} 
                      onChange={(value: any) => setFormData({ ...formData, description: value })} 
                      className="h-40 mb-12"
                    />
                  </div>
                </div>

                {/* Specs */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-slate-700">Specifications</label>
                    <button type="button" onClick={addSpecRow} className="text-xs flex items-center gap-1 bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 font-bold text-slate-700">
                      <Plus size={14} /> Add Spec
                    </button>
                  </div>
                  <div className="space-y-2 bg-slate-50 p-4 rounded-xl">
                    {specs.map((spec, index) => (
                      <div key={index} className="flex gap-2">
                        <input placeholder="Key (e.g. Color)" value={spec.key} onChange={(e) => updateSpec(index, 'key', e.target.value)} className="flex-1 px-3 py-2 text-sm border rounded-lg outline-none" />
                        <input placeholder="Value (e.g. Red)" value={spec.value} onChange={(e) => updateSpec(index, 'value', e.target.value)} className="flex-1 px-3 py-2 text-sm border rounded-lg outline-none" />
                        <button type="button" onClick={() => removeSpecRow(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg flex items-center gap-2"><Save size={18} /> {editingProduct ? 'Update Product' : 'Create Product'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}