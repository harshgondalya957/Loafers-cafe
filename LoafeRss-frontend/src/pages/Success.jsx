import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaCheckCircle, FaStore } from 'react-icons/fa';

const Success = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const connected = params.get("connected");

    useEffect(() => {
        if (connected === "true") {
            const timer = setTimeout(() => {
                navigate('/admin/settings');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [connected, navigate]);

    return (
        <div className="min-h-screen bg-[#FFF5E5] flex flex-col items-center justify-center p-4">
            <div className="bg-white p-12 rounded-[40px] shadow-2xl border border-pink-100 flex flex-col items-center max-w-md w-full text-center space-y-6">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-500 text-5xl animate-bounce">
                    <FaCheckCircle />
                </div>

                <h1 className="text-4xl font-bold text-gray-800">Connection Successful!</h1>

                <p className="text-gray-600 font-medium leading-relaxed">
                    Your Clover account has been successfully linked with Loafers app.
                    Tokens are now synced and updated.
                </p>

                <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 rounded-2xl text-gray-400 font-bold text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Redirecting to Dashboard...
                </div>

                <button
                    onClick={() => navigate('/admin/settings')}
                    className="flex items-center gap-2 bg-primary text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-pink-100 hover:shadow-xl hover:-translate-y-1 transition-all uppercase tracking-widest text-sm"
                >
                    <FaStore /> Go to Settings
                </button>
            </div>
        </div>
    );
};

export default Success;
