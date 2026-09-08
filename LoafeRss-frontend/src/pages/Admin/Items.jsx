import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config';
import { FaEdit, FaTrash, FaEye, FaEyeSlash } from 'react-icons/fa';

const Items = () => {
    // Data States
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [customizationGroups, setCustomizationGroups] = useState([]);
    const [filteredSubCategories, setFilteredSubCategories] = useState([]);

    // Form States
    const initialFormState = {
        name: '',
        price: '',
        calories: '',
        category: '',
        subCategory: '',
        customizationGroup: 'None',
        description: '',
        dietaryTags: { veg: false, vegan: false, glutenFree: false, halal: false },
        status: 'active',
        imageUrl: ''
    };
    const [formData, setFormData] = useState(initialFormState);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    
    // UI States
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch Data on Load
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // બધો ડેટા ડેટાબેઝમાંથી એકસાથે લાવવા માટે (API લિંક જરૂર મુજબ બદલવી)
            const [itemsRes, catRes, subCatRes, custRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/products`).catch(() => ({ data: [] })),
                axios.get(`${API_BASE_URL}/api/categories`).catch(() => ({ data: [] })),
                axios.get(`${API_BASE_URL}/api/subcategories`).catch(() => ({ data: [] })), 
                axios.get(`${API_BASE_URL}/api/customizations`).catch(() => ({ data: [] }))
            ]);

            setItems(itemsRes.data || []);
            setCategories(catRes.data || []);
            setSubCategories(subCatRes.data || []);
            setCustomizationGroups(custRes.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    // Handle Input Change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Handle Category Change (Sub-category ને ડેટાબેઝ મુજબ ફિલ્ટર કરવા માટે)
    const handleCategoryChange = (e) => {
        const selectedCat = e.target.value;
        const filtered = subCategories.filter(sub => 
            sub.category === selectedCat || sub.parentCategory === selectedCat
        );
        setFilteredSubCategories(filtered);
        setFormData({ ...formData, category: selectedCat, subCategory: '' });
    };

    // Handle Image Upload Selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // Handle Dietary Tags Toggle
    const handleTagToggle = (tag) => {
        setFormData({
            ...formData,
            dietaryTags: { ...formData.dietaryTags, [tag]: !formData.dietaryTags[tag] }
        });
    };

    // Handle Status Toggle
    const handleStatusToggle = () => {
        setFormData({
            ...formData,
            status: formData.status === 'active' ? 'inactive' : 'active'
        });
    };

    // Handle Edit Click
    const handleEdit = (item) => {
        setIsEditing(true);
        setEditId(item._id);
        
        const defaultTags = { veg: false, vegan: false, glutenFree: false, halal: false };
        const itemTags = item.dietaryTags || defaultTags;

        setFormData({
            name: item.name || '',
            price: item.price || '',
            calories: item.calories || '',
            category: item.category || '',
            subCategory: item.subCategory || '',
            customizationGroup: item.customizationGroup || 'None',
            description: item.description || '',
            dietaryTags: typeof itemTags === 'string' ? JSON.parse(itemTags) : itemTags,
            status: item.status || 'active',
            imageUrl: item.imageUrl || ''
        });
        
        setImagePreview('');
        setImageFile(null);

        if (item.category) {
            const filtered = subCategories.filter(sub => 
                sub.category === item.category || sub.parentCategory === item.category
            );
            setFilteredSubCategories(filtered);
        }
    };

    // Handle Delete
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/products/${id}`);
            alert("✅ Item successfully deleted!");
            fetchData();
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("❌ Failed to delete item.");
        }
    };

    // Handle Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalImageUrl = formData.imageUrl;

            if (imageFile) {
                const uploadData = new FormData();
                uploadData.append('image', imageFile);
                const uploadRes = await axios.post(`${API_BASE_URL}/api/admin/upload-image`, uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.data.success) {
                    finalImageUrl = uploadRes.data.imageUrl;
                } else {
                    throw new Error("Image upload failed");
                }
            }

            const itemDataToSave = { ...formData, imageUrl: finalImageUrl };

            if (isEditing) {
                await axios.put(`${API_BASE_URL}/api/products/${editId}`, itemDataToSave);
                alert("✅ Item updated successfully!");
            } else {
                await axios.post(`${API_BASE_URL}/api/products`, itemDataToSave);
                alert("✅ Item added successfully!");
            }

            setFormData(initialFormState);
            setImageFile(null);
            setImagePreview('');
            setIsEditing(false);
            setEditId(null);
            fetchData();
            
        } catch (error) {
            console.error("Error saving item:", error);
            alert("❌ Failed to save item.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData(initialFormState);
        setImageFile(null);
        setImagePreview('');
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-4">
            <div className="w-full lg:w-2/3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Item Catalogue</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs text-gray-400 uppercase border-b border-gray-100">
                            <tr>
                                <th className="pb-3 font-semibold">Name</th>
                                <th className="pb-3 font-semibold">Price</th>
                                <th className="pb-3 font-semibold">Category</th>
                                <th className="pb-3 font-semibold">Status</th>
                                <th className="pb-3 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {items.map((item) => (
                                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-4 font-medium text-gray-800 flex items-center gap-3">
                                        {item.imageUrl && (
                                            <img src={item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                                        )}
                                        {item.name}
                                    </td>
                                    <td className="py-4 font-medium text-pink-500">£{item.price}</td>
                                    <td className="py-4 text-gray-500">{item.category}</td>
                                    <td className="py-4">
                                        {item.status === 'active' || item.status === true ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full border border-green-200">
                                                <FaEye /> LIVE
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full border border-gray-200">
                                                <FaEyeSlash /> HIDDEN
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => handleEdit(item)} className="text-blue-500 hover:text-blue-700 transition-colors">
                                                <FaEdit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(item._id)} className="text-red-500 hover:text-red-700 transition-colors">
                                                <FaTrash size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="w-full lg:w-1/3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-1 h-6 bg-pink-500 rounded-full"></span>
                        {isEditing ? 'Edit Item' : 'Add Item'}
                    </h2>
                    {isEditing && (
                        <button onClick={handleCancelEdit} type="button" className="text-xs font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-pink-500 outline-none text-sm" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Image Upload</label>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-pink-500 outline-none text-sm bg-gray-50 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-pink-50 file:text-pink-600 hover:file:bg-pink-100 cursor-pointer" />
                        
                        {(imagePreview || formData.imageUrl) && (
                            <div className="mt-3 relative inline-block">
                                <img src={imagePreview || (formData.imageUrl.startsWith('http') ? formData.imageUrl : `${API_BASE_URL}${formData.imageUrl}`)} alt="Preview" className="h-24 w-24 object-cover rounded-xl border border-gray-200 shadow-sm" />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-600 mb-1">Price (£)</label>
                            <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} required className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-pink-500 outline-none text-sm" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-600 mb-1">Calories (kcal)</label>
                            <input type="number" name="calories" value={formData.calories} onChange={handleChange} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-pink-500 outline-none text-sm" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Category</label>
                        <select name="category" value={formData.category} onChange={handleCategoryChange} required className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-pink-500 outline-none text-sm bg-white">
                            <option value="">Select Category</option>
                            {categories.map((cat, index) => (
                                <option key={index} value={cat.name || cat.title || cat._id}>{cat.name || cat.title}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Sub-Category</label>
                        <select name="subCategory" value={formData.subCategory} onChange={handleChange} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-pink-500 outline-none text-sm bg-white">
                            <option value="">Select Sub-Category</option>
                            {filteredSubCategories.map((sub, index) => (
                                <option key={index} value={sub.name || sub.title || sub._id}>{sub.name || sub.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Customization Group (હવે પાછું આવી ગયું છે!) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Customization Group</label>
                        <select name="customizationGroup" value={formData.customizationGroup} onChange={handleChange} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-pink-500 outline-none text-sm bg-white">
                            <option value="None">None</option>
                            {customizationGroups.map((group, index) => (
                                <option key={index} value={group.name || group.title || group._id}>{group.name || group.title}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="2" className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-pink-500 outline-none text-sm resize-none"></textarea>
                    </div>

                    {/* Dietary Tags (આ પણ પાછું આવી ગયું છે!) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2">Dietary Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {['veg', 'vegan', 'glutenFree', 'halal'].map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => handleTagToggle(tag)}
                                    className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${formData.dietaryTags[tag] ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                >
                                    {tag === 'glutenFree' ? 'Gluten Free' : tag.charAt(0).toUpperCase() + tag.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                            <p className="text-sm font-bold text-gray-800">Publish Status</p>
                            <p className="text-xs text-gray-500">Make this item visible</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleStatusToggle}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.status === 'active' ? 'bg-pink-500' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.status === 'active' ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl shadow-md transition-all">
                        {loading ? 'Saving...' : (isEditing ? 'Update Item' : 'Add Item')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Items;