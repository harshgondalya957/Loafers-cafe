const mongoose = require('mongoose');

const StoreSettingsSchema = new mongoose.Schema({
    open_time: { type: String, default: '09:00' },
    close_time: { type: String, default: '22:00' },
    delivery_enabled: { type: Boolean, default: true },
    pickup_enabled: { type: Boolean, default: true },
    auto_print_enabled: { type: Boolean, default: false },
    last_token_number: { type: Number, default: 0 },
    last_token_date: { type: String }, // DD/MM/YYYY
    token_prefix: { type: String, default: 'LFR-' },
    token_reset_daily: { type: Boolean, default: true }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('StoreSettings', StoreSettingsSchema);
