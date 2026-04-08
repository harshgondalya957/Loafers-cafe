import axios from 'axios';
import React, { useEffect, useState, useRef } from 'react';
import { FaChartBar, FaShoppingCart, FaRupeeSign, FaUsers, FaArrowRight, FaBoxOpen, FaClipboardCheck, FaMotorcycle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { debugLog } from '../../utils/debug';

let isAlreadyLogged = false;

let errorLogged = false;

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalOrders: 0,
        activeOrders: 0,
        totalRevenue: 0,
        totalCustomers: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [riders, setRiders] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Task: Single Retry Guard using Ref for closure stability
    const retryCount = useRef(0);

    const merchantId = localStorage.getItem("merchantId");
    const token = localStorage.getItem("token");

    useEffect(() => {
        let isSubscribed = true;
        fetchDashboardData(); 

        // Poll every 10 seconds to get automatic updates
        const intervalId = setInterval(() => {
            if (isSubscribed) {
                fetchDashboardData(true);
            }
        }, 10000);

        return () => {
            isSubscribed = false;
            clearInterval(intervalId);
        };
    }, []); // FIXED: MUST BE EMPTY

    const fetchDashboardData = async (silent = false) => {
        const ordersUrl = `http://localhost:5001/api/admin/reports/orders?type=date`;
        const activeUrl = `http://localhost:5001/api/store/orders/active`;
        const customersUrl = `http://localhost:5001/api/admin/customers`;
        const ridersUrl = `http://localhost:5001/api/store/riders`;

        if (!silent) console.log("➡️ API CALL (Dashboard):", ordersUrl);

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [ordersRes, activeRes, customersRes, ridersRes] = await Promise.all([
                axios.get(ordersUrl, config),
                axios.get(activeUrl, config),
                axios.get(customersUrl, config),
                axios.get(ridersUrl, config)
            ]);

            if (ordersRes.status === 401) return;

            // Step 1: Safe Data Extraction
            const orders = (ordersRes.data?.reports || ordersRes.data?.data || ordersRes.data?.orders || ordersRes.data || []);
            const active = (activeRes.data?.orders || activeRes.data?.data || activeRes.data || []);
            const customers = (customersRes.data?.customers || customersRes.data?.data || customersRes.data || []);
            const ridersList = (ridersRes.data?.riders || ridersRes.data?.data || ridersRes.data || []);

            setRiders(Array.isArray(ridersList) ? ridersList : []);

            const today = new Date().toISOString().split('T')[0];
            const todayStats = (Array.isArray(orders) ? orders : []).find(o => o.period === today) || { total_orders: 0, total_revenue: 0 };

            setStats({
                totalOrders: Number(todayStats.total_orders) || 0,
                activeOrders: (Array.isArray(active) ? active : []).length || 0,
                totalRevenue: Number(todayStats.total_revenue) || 0,
                totalCustomers: (Array.isArray(customers) ? customers : []).length || 0
            });
            setRecentOrders((Array.isArray(active) ? active : []).slice(0, 10) || []); 
        } catch (error) {
            console.error("❌ FETCH ERROR (Internal):", error?.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        const url = `http://localhost:5001/api/store/orders/${id}/status`;
        try {
            const response = await axios.put(url, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            debugLog("UPDATE STATUS RESPONSE", response.data);
            fetchDashboardData(true);
        } catch (error) {
            console.error("❌ ERROR IN PAGE (Update Status):", error?.response?.data || error.message);
        }
    };

    const assignRider = async (orderId, riderId) => {
        const url = `http://localhost:5001/api/store/orders/${orderId}/status`;
        try {
            const order = (recentOrders || []).find(o => (o.id || o._id) === orderId);
            const currentStatus = order ? order.status : 'pending';

            const response = await axios.put(url, { 
                status: currentStatus, 
                rider_id: riderId 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            debugLog("ASSIGN RIDER RESPONSE", response.data);
            fetchDashboardData(true);
        } catch (error) {
            console.error("❌ ERROR IN PAGE (Assign Rider):", error?.response?.data || error.message);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-full text-pink-500 font-bold text-xl px-10 animate-pulse">Loading Dashboard...</div>;

    return (
        <div className="space-y-8">
            <h2 className="text-4xl font-heading font-bold text-primary tracking-tighter">Store Dashboard</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-pink-50 flex items-center justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                    <div>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Today's Orders</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.totalOrders}</h3>
                    </div>
                    <div className="bg-pink-100 p-4 rounded-full text-primary">
                        <FaShoppingCart size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-pink-50 flex items-center justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                    <div>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Active Orders</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.activeOrders}</h3>
                    </div>
                    <div className="bg-yellow-100 p-4 rounded-full text-yellow-600">
                        <FaClipboardCheck size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-pink-50 flex items-center justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                    <div>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Today's Revenue</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-1">£{(stats.totalRevenue || 0).toFixed(2)}</h3>
                    </div>
                    <div className="bg-green-100 p-4 rounded-full text-green-600">
                        <FaRupeeSign size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-pink-50 flex items-center justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                    <div>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Total Customers</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.totalCustomers}</h3>
                    </div>
                    <div className="bg-blue-100 p-4 rounded-full text-blue-600">
                        <FaUsers size={24} />
                    </div>
                </div>
            </div>

            {/* Active Orders List */}
            <div className="bg-white rounded-3xl shadow-xl border border-pink-50 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-2 h-8 bg-primary rounded-full"></span>
                        Active Orders
                    </h3>
                    <Link to="/admin/orders" className="text-primary font-bold hover:underline hover:scale-105 transition-transform flex items-center">
                        View All <FaArrowRight className="ml-2" />
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest rounded-l-lg">Token</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Total</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Rider</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest rounded-r-lg">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {(recentOrders || []).length > 0 ? (recentOrders || []).map((order, idx) => (
                                <tr key={order.id || order._id || idx} className="hover:bg-primary/5 hover:scale-[1.005] transition-all duration-200 cursor-pointer bg-white">
                                    <td className="px-6 py-4 font-black text-primary text-xl">#{order.tokenNumber || "-"}</td>
                                    <td className="px-6 py-4 text-gray-800 font-bold">{order.customer_name || 'Guest'}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wide border border-gray-200">
                                            {order.order_type || 'Delivery'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-primary">£{(Number(order.total_amount) || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        {/* Rider Dropdown */}
                                        <div className="flex items-center gap-2">
                                            <FaMotorcycle className="text-gray-400" />
                                            <select
                                                value={order.rider_id || ''}
                                                onChange={(e) => assignRider(order.id || order._id, e.target.value)}
                                                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg block w-full p-2.5 focus:ring-primary focus:border-primary font-bold"
                                            >
                                                <option value="">Select Rider</option>
                                                {(riders || []).map(r => (
                                                    <option key={r.id || r._id} value={r.id || r._id} disabled={r.status !== 'available' && (r.id !== order.rider_id && r._id !== order.rider_id)}>
                                                        {r.name || "Unknown"} ({r.status || "N/A"})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={order.status || 'pending'}
                                            onChange={(e) => updateStatus(order.id || order._id, e.target.value)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold border-none outline-none cursor-pointer
                                                ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'}`}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="preparing">Preparing</option>
                                            <option value="ready">Ready</option>
                                            <option value="delivery">Out for Delivery</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link to="/admin/orders" className="text-gray-400 hover:text-primary transition-colors">
                                            <FaBoxOpen size={18} />
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-400 font-bold">No active orders right now.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
