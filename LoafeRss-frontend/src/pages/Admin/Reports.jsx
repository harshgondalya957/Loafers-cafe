import API_BASE_URL from '../../config';
import axios from 'axios';
import React, { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { debugLog } from '../../utils/debug';

let isAlreadyLogged = false;

let errorLogged = false;

const Reports = () => {
    const [reportType, setReportType] = useState('date'); // date, month, year
    const [orderData, setOrderData] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [deliveryData, setDeliveryData] = useState([]);
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem("token");

    useEffect(() => {
        fetchReports();
    }, [reportType]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [ordersRes, salesRes, deliveryRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/admin/reports/orders?type=${reportType}`, config),
                axios.get(`${API_BASE_URL}/api/admin/reports/sales?type=${reportType}`, config),
                axios.get(`${API_BASE_URL}/api/admin/reports/delivery`, config)
            ]);

            const orders = ordersRes?.data?.reports || ordersRes?.data || [];
            const sales = salesRes?.data?.reports || salesRes?.data || [];
            const delivery = deliveryRes?.data?.delivery || deliveryRes?.data || [];

            setOrderData(Array.isArray(orders) ? orders : []);
            setSalesData(Array.isArray(sales) ? sales : []);
            setDeliveryData(Array.isArray(delivery) ? delivery : []);

        } catch (err) {
            console.error("âŒ Reports error:", err?.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#F43F97', '#6366F1', '#10B981', '#F59E0B', '#EF4444'];

    return (
        <div className="space-y-6 md:space-y-8">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-heading font-bold text-primary tracking-tighter px-2 md:px-0">Performance Reports</h2>

            <div className="flex flex-wrap gap-3 mb-8 px-2 md:px-0">
                {['date', 'month', 'year'].map(type => (
                    <button
                        key={type}
                        onClick={() => setReportType(type)}
                        className={`px-4 md:px-6 py-2 rounded-full font-bold uppercase tracking-wider text-xs md:text-sm transition-all duration-200 ${reportType === type
                            ? 'bg-primary text-white shadow-lg shadow-pink-200 transform -translate-y-0.5'
                            : 'bg-white text-gray-500 hover:text-primary hover:bg-white shadow-sm'
                            }`}
                    >
                        By {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : (
                <>
                    {/* Sales Performance */}
                    <div className="bg-white p-4 md:p-8 rounded-3xl shadow-xl border border-pink-50">
                        <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                            <span className="w-2 h-8 bg-pink-500 rounded-full"></span>
                            Sales Trends
                        </h3>
                        <div style={{ width: "100%", height: 300 }}>
                            {salesData && salesData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={salesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="period" stroke="#9CA3AF" />
                                        <YAxis stroke="#F43F97" />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="total_revenue" stroke="#F43F97" name="Revenue (£)" strokeWidth={3} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-2xl">
                                    No sales data available
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-4 md:p-8 rounded-3xl shadow-xl border border-pink-50">
                        <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                            <span className="w-2 h-8 bg-primary rounded-full"></span>
                            Order & Revenue Volume
                        </h3>
                        {/* TASK 4: FIX CHART SIZE */}
                        <div style={{ width: "100%", height: 300 }}>
                            {orderData && orderData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={orderData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="period" stroke="#9CA3AF" />
                                        <YAxis yAxisId="left" orientation="left" stroke="#F43F97" />
                                        <YAxis yAxisId="right" orientation="right" stroke="#6366F1" />
                                        <Tooltip />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="total_orders" fill="#F43F97" name="Orders" />
                                        <Bar yAxisId="right" dataKey="total_revenue" fill="#6366F1" name="Revenue (£)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-2xl">
                                    No order data available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Delivery Reports */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-pink-50">
                            <h3 className="text-xl font-bold mb-4 text-gray-800">Deliveries Share</h3>
                            <div style={{ width: "100%", height: 300 }}>
                                {deliveryData && deliveryData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={deliveryData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                paddingAngle={5}
                                                dataKey="total_deliveries"
                                                nameKey="rider_name"
                                                label
                                            >
                                                {deliveryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-2xl">
                                        No delivery data available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Reports;

