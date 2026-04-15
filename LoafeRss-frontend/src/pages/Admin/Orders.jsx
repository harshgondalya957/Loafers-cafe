import React, { useState, useEffect, useRef } from 'react';
import axios from "axios";
import API_BASE_URL from "../../config";
import { FaTrash, FaExclamationTriangle, FaArrowRight, FaPrint } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';
import { menuData } from '../../data/products';
import { debugLog } from '../../utils/debug';

let errorLogged = false;

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const token = localStorage.getItem("token");

    // Setup for printing the receipt Modal
    const receiptRef = useRef();
    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Order_Receipt_${selectedOrder?.tokenNumber || Date.now()}`,
    });

    useEffect(() => {
        let isSubscribed = true;
        fetchOrders();

        const intervalId = setInterval(() => {
            if (isSubscribed) fetchOrders(true);
        }, 10000);

        return () => {
            isSubscribed = false;
            clearInterval(intervalId);
        };
    }, []);

    const fetchOrders = async (silent = false) => {
        const url = `${API_BASE_URL}/api/admin/orders`;
        try {
            if (!silent) setLoading(true);
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const fetchedOrders = res.data?.orders || res.data?.data || res.data || [];
            setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);
        } catch (error) {
            console.error("❌ ERROR (Fetch Orders):", error.message);
        } finally {
            if (!silent) setLoading(false);
        }
    };


    const fetchOrderDetails = async (id) => {
        const url = `${API_BASE_URL}/api/admin/orders/${id}`;
        console.log("➡️ API CALL (Order Details):", url, { merchantId, token });

        try {
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const responseData = await res.json();
                debugLog("ORDER DETAILS DATA", responseData);
                // FIX: Support nested data
                setSelectedOrder(responseData?.order || responseData?.data || responseData);
                setShowModal(true);
            }
        } catch (error) {
            console.error("❌ ERROR IN PAGE (Fetch Order Details):", error.message || error);
        }
    };

    const handleDeleteOrder = async (id) => {
        if (window.confirm('Are you sure you want to cancel/delete this order?')) {
            const url = `${API_BASE_URL}/api/admin/orders/${id}`;
            console.log("➡️ API CALL (Delete Order):", url, { merchantId, token });

            try {
                const response = await fetch(url, {
                    method: 'DELETE',
                });
                if (response.ok) {
                    const resData = await response.json();
                    debugLog("DELETE ORDER RESPONSE", resData);
                    setOrders((prev) => (prev || []).filter(order => (order.id || order._id) !== id));
                    if (selectedOrder && (selectedOrder.id === id || selectedOrder._id === id)) setShowModal(false);
                } else {
                    alert('Failed to delete order');
                }
            } catch (error) {
                console.error("❌ ERROR IN PAGE (Delete Order):", error.message || error);
            }
        }
    };

    const handleDeleteAllOrders = async () => {
        if (window.confirm('WARNING: This will delete ALL orders. Are you sure?')) {
            const url = `${API_BASE_URL}/api/admin/orders/all`;
            console.log("➡️ API CALL (Delete All Orders):", url, { merchantId, token });

            try {
                const response = await fetch(url, {
                    method: 'DELETE',
                });
                if (response.ok) {
                    const resData = await response.json();
                    debugLog("DELETE ALL ORDERS RESPONSE", resData);
                    setOrders([]);
                    setShowModal(false);
                    alert('All orders deleted successfully');
                } else {
                    alert('Failed to delete all orders');
                }
            } catch (error) {
                console.error("❌ ERROR IN PAGE (Delete All Orders):", error.message || error);
            }
        }
    };

    return (
        <div className="bg-white p-4 md:p-8 rounded-3xl shadow-xl border border-pink-50 relative">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-heading font-bold text-primary tracking-tighter">Orders</h2>

                <button
                    onClick={handleDeleteAllOrders}
                    className="flex items-center px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-100 transition-all transform hover:scale-105"
                >
                    <FaExclamationTriangle className="mr-2" /> Delete All Demo Orders
                </button>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Token</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Total</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {(orders || []).length > 0 ? (
                                orders.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-400">
                                            <div className="flex flex-col">
                                                <span className="text-primary font-black text-2xl">
                                                    #{item.tokenNumber || "-"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : (item.created_at ? new Date(item.created_at).toLocaleDateString() : "-")}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                                            {item.customer || item.customer_name || "Guest"}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">£{(Number(item.total || item.total_amount || 0)).toFixed(2)}</td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${item.status === 'completed' || item.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                                item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {item.status || item.state || "Pending"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(item);
                                                    setShowModal(true);
                                                }}
                                                className="text-primary hover:text-pink-600 font-bold text-sm bg-pink-50 px-4 py-2 rounded-lg transition-all transform hover:scale-105 inline-flex items-center gap-2"
                                            >
                                                Details <FaArrowRight className="text-[10px]" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-sm font-medium text-gray-400 italic">No Data Found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Details Modal */}
            {showModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn" onClick={e => e.stopPropagation()}>

                        {/* Printable Area starts below */}
                        <div ref={receiptRef} className="p-0 bg-white" style={{ padding: '0', margin: '0' }}>
                            {/* We re-add a special print-only header here for the receipt paper if needed.
                                For now we will print the content inside the modal directly. */}

                            <div className="bg-primary p-6 text-white flex justify-between items-center print:bg-black font-sans">
                                <div>
                                    <h3 className="text-4xl font-heading font-black tracking-tighter">
                                        Token No: #{selectedOrder.tokenNumber || "-"}
                                    </h3>
                                    <p className="text-white/80 text-sm font-bold uppercase mt-1">
                                        {new Date(selectedOrder.created_at || selectedOrder.order_date).toLocaleString()}
                                    </p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors print:hidden">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-4 md:p-6 max-h-[80vh] md:max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible">
                                {/* Customer Info */}
                                <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100 print:bg-white print:border-black">
                                    <h4 className="font-bold text-gray-700 mb-2 uppercase text-xs tracking-wider print:text-black">Customer Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 print:text-gray-800">Name</p>
                                            <p className="font-bold text-gray-800 print:text-black">{selectedOrder.customer_name || 'Guest'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 print:text-gray-800">Email</p>
                                            <p className="font-bold text-gray-800 print:text-black">{selectedOrder.customer_email || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 print:text-gray-800">Phone</p>
                                            <p className="font-bold text-gray-800 print:text-black">{selectedOrder.customer_phone || 'N/A'}</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <p className="text-sm text-gray-500 print:text-gray-800">Address / Pickup Time</p>
                                            <p className="font-bold text-gray-800 print:text-black">
                                                {selectedOrder.order_type === 'delivery'
                                                    ? (selectedOrder.delivery_address || 'No Address Provided')
                                                    : `Pickup Selection (Scheduled: ${selectedOrder.scheduled_time || 'ASAP'})`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div>
                                    <h4 className="font-bold text-gray-700 mb-4 uppercase text-xs tracking-wider border-b pb-2 print:border-black print:text-black">Items Ordered</h4>
                                    <div className="space-y-4">
                                        {selectedOrder.items && selectedOrder.items.length > 0 ? (
                                            selectedOrder.items.map((item, idx) => {
                                                const getParsedName = () => {
                                                    if (item.name && item.name !== 'Unknown Item') return item.name;
                                                    if (typeof item.item_id === 'string' && item.item_id.includes('-')) {
                                                        const parts = item.item_id.split('-');
                                                        const lastPart = parts[parts.length - 1];
                                                        if (!isNaN(lastPart) && lastPart.length > 8) {
                                                            return parts.slice(0, -1).join('-');
                                                        }
                                                    }
                                                    return item.name || `Item #${item.item_id}`;
                                                };

                                                const itemName = getParsedName();
                                                const getProductImage = (name) => {
                                                    if (item.image) return item.image;
                                                    if (!name) return null;
                                                    for (const category of Object.values(menuData)) {
                                                        const found = category.find(p => p.name === name);
                                                        if (found && found.image) return found.image;
                                                    }
                                                    return null;
                                                };
                                                const displayImage = getProductImage(itemName);

                                                return (
                                                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow print:border-b print:border-l-0 print:border-r-0 print:border-t-0 print:rounded-none">
                                                        <div className="flex items-center gap-4">
                                                            {/* Image */}
                                                            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 print:hidden">
                                                                {displayImage ? (
                                                                    <img src={displayImage} alt={itemName} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Img</div>
                                                                )}
                                                            </div>

                                                            {/* Quantity Badge */}
                                                            <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 print:bg-white print:text-black print:w-auto print:h-auto print:mr-2">
                                                                {item.quantity}x
                                                            </div>

                                                            {/* Details */}
                                                            <div>
                                                                <p className="font-bold text-gray-800 print:text-black">{itemName}</p>
                                                                <p className="text-xs text-gray-500 uppercase">{item.category || 'General'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="font-bold text-gray-900 print:text-black">
                                                            £{((item.price_at_sale || item.price || 0) * item.quantity).toFixed(2)}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-gray-400 text-center py-4">No items details found.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Total Footer */}
                                <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center print:border-black">
                                    <span className="text-gray-500 font-medium print:text-black">Total Amount</span>
                                    <span className="text-3xl font-heading font-bold text-primary print:text-black">£{selectedOrder.total_amount?.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="hidden print:block text-center mt-12 mb-8 text-sm text-gray-500">
                                Thank you for ordering with Loafers!
                            </div>
                        </div>
                        {/* Printable Area ends */}

                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 print:hidden">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors">
                                Close
                            </button>
                            <button
                                onClick={() => handlePrint()}
                                className="px-6 py-2 bg-primary text-white font-bold rounded-xl shadow-lg shadow-pink-200 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2"
                            >
                                <FaPrint /> Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;
