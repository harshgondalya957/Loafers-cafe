require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');

async function migrate() {
    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/loafers';
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const orders = await Order.find({
            $or: [
                { tokenNumber: { $exists: false } },
                { tokenNumber: null },
                { tokenNumber: "" }
            ]
        });
        console.log(`Found ${orders.length} orders lacking proper tokenNumber`);

        let count = 1;
        for (let order of orders) {
            const tokenStr = `LFR-${String(count).padStart(3, '0')}`;
            order.tokenNumber = tokenStr;
            order.token_number = count; // Legacy backup
            await order.save({ validateBeforeSave: false });
            count++;
            if (count > 999) count = 1;
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

migrate();
