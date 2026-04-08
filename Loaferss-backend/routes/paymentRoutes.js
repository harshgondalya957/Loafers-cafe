const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');

// Unified secure payment and order creation handler
router.post('/place-order', shopController.placeOrder);

module.exports = router;
