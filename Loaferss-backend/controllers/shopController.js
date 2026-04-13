const Order = require('../models/Order');
const User = require('../models/User');

exports.syncUser = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        let user = await User.findOne({ email });
        if (user) {
            user.name = name;
            user.phone = phone;
            await user.save();
        } else {
            user = await User.create({ name, email, phone });
        }
        res.json({ message: 'User synced', id: user.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.createOrder = async (req, res) => {
    return res.status(403).json({ error: "Direct order creation is disabled. Please use the secure /api/payment/place-order endpoint." });
};

exports.placeOrder = async (req, res) => {
    try {
        const { orderData, paymentMethod, token } = req.body;

        const {
            customer_name,
            customer_email,
            customer_phone,
            store_id,
            total_amount,
            items,
            delivery_address,
            order_type,
            scheduled_time,
            postcode,
            instructions
        } = orderData || {};

        console.log("Creating Order for:", customer_email);

        // 1. Find or Create User
        let user = await User.findOne({ email: customer_email });
        if (!user) {
            user = await User.create({
                name: customer_name || 'Guest',
                email: customer_email,
                phone: customer_phone || ''
            });
        } else {
            // Update fields if provided
            if (customer_phone) user.phone = customer_phone;
            if (customer_name && user.name === 'Customer') user.name = customer_name;
            await user.save();
        }

        // Check store timings logic using UK timezone
        const StoreSettings = require('../models/StoreSettings');
        const settings = await StoreSettings.findOne() || { open_time: '09:00', close_time: '22:00' };
        const now = new Date();

        // Get current time in Europe/London (UK)
        const ukTimeStr = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/London',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        }).format(new Date());

        const [ukHour, ukMin] = ukTimeStr.split(':').map(Number);
        const currentTime = ukHour * 60 + ukMin;

        console.log(`🕒 UK Current Time: ${ukTimeStr} (${currentTime} mins)`);
        console.log(`🏪 Store Hours: ${settings.open_time} to ${settings.close_time}`);

        const openParts = (settings.open_time || '09:00').split(':');
        const closeParts = (settings.close_time || '22:00').split(':');

        const openMins = parseInt(openParts[0]) * 60 + parseInt(openParts[1]);
        const closeMins = parseInt(closeParts[0]) * 60 + parseInt(closeParts[1]);

        let isStoreOpen = false;
        if (closeMins > openMins) {
            isStoreOpen = currentTime >= openMins && currentTime <= closeMins;
        } else {
            isStoreOpen = currentTime >= openMins || currentTime <= closeMins;
        }

        // Validate ASAP outside hours
        const bypassHours = process.env.BYPASS_STORE_HOURS === 'true';
        if (!isStoreOpen && (!scheduled_time || scheduled_time === 'ASAP') && !bypassHours) {
            return res.status(400).json({ error: "Store is currently closed. You must schedule your order for later." });
        }

        // Validate scheduled time valid
        if (scheduled_time && scheduled_time !== 'ASAP') {
            const requestedTime = new Date(scheduled_time);
            if (requestedTime < now) {
                return res.status(400).json({ error: "Cannot schedule an order in the past." });
            }

            // Check if the scheduled time is within operating hours for the scheduled day (simplified check for time part)
            const scheduledMins = requestedTime.getHours() * 60 + requestedTime.getMinutes();
            let isScheduledWithinHours = false;

            if (closeMins > openMins) {
                isScheduledWithinHours = scheduledMins >= openMins && scheduledMins <= closeMins;
            } else {
                isScheduledWithinHours = scheduledMins >= openMins || scheduledMins <= closeMins;
            }

            if (!isScheduledWithinHours) {
                return res.status(400).json({ error: `Scheduled time must be within our opening hours (${settings.open_time} to ${settings.close_time}).` });
            }
        }

        // 2. Mock Payment if Card (Clover Charge Logic Removed)
        let transactionId = null;
        if (paymentMethod === 'CARD') {
            console.log("💳 Mock Card Payment (Clover Removed)");
            transactionId = "MOCK-CARD-" + Date.now();
        }

        // 3. Create Order
        // Map items to schema structure
        const orderItems = (items || []).map(i => ({
            item_id: i.id,
            name: i.name,
            price: parseFloat(i.price),
            quantity: i.quantity,
            image: i.image,
            category: i.category,
            customizations: i.customizations // if any
        }));

        const order_date_formatted = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
        const order_time_formatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        // GENERATE TOKEN NUMBER (1-500 rolling + daily reset support)
        let finalToken = "";
        try {
            let settings = await StoreSettings.findOne();
            if (!settings) {
                settings = await StoreSettings.create({
                    open_time: '09:00',
                    close_time: '22:00',
                    last_token_number: 0,
                    last_token_date: order_date_formatted
                });
            }

            // Check daily reset
            if (settings.token_reset_daily && settings.last_token_date !== order_date_formatted) {
                settings.last_token_number = 0;
                settings.last_token_date = order_date_formatted;
            }

            let nextNum = (settings.last_token_number || 0) + 1;
            if (nextNum > 999) nextNum = 1; // Cap at 999 or user preference

            settings.last_token_number = nextNum;
            settings.last_token_date = order_date_formatted;
            await settings.save();

            const prefix = settings.token_prefix || "LFR-";
            finalToken = `${prefix}${String(nextNum).padStart(3, '0')}`;
            console.log("🎟️ Generated Token Number:", finalToken);
        } catch (tokenErr) {
            console.error("Error generating token number:", tokenErr);
            finalToken = `TKN-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const newOrder = new Order({
            customer_id: user._id,
            customer_name: customer_name || user.name,
            customer_email: customer_email || user.email,
            customer_phone: customer_phone || user.phone,
            store_id: store_id || '1',
            total_amount: parseFloat(total_amount),
            items: orderItems,
            order_type: order_type || 'delivery',
            payment_method: paymentMethod || 'COD',
            delivery_address: delivery_address ? `${delivery_address}${postcode ? ', ' + postcode : ''}` : '', // Combine if needed or check schema
            postcode: postcode,
            delivery_instructions: instructions,
            scheduled_time: scheduled_time,
            order_date: order_date_formatted,
            order_time: order_time_formatted,
            status: paymentMethod === 'CARD' ? 'Paid' : 'Pending Payment',
            transactionId: transactionId || null,
            tokenNumber: finalToken,
            token_number: parseInt(finalToken.split('-')[1]) || 0 // Legacy support
        });

        await newOrder.save();
        console.log("Order Saved securely via placeOrder:", newOrder.id);

        res.status(201).json({ message: 'Order created', id: newOrder.id, order: newOrder });

    } catch (err) {
        console.error("Secure Order Creation Error:", err);
        res.status(500).json({ error: err.message });
    }
};
