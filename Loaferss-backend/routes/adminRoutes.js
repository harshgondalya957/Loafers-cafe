const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../assets/item-images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'item-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'કોઈ ઇમેજ અપલોડ થઈ નથી' });
    }
    const imageUrl = `/assets/item-images/${req.file.filename}`;
    res.json({ success: true, imageUrl: imageUrl });
});


const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin Auth
router.post('/login', adminController.adminLogin);

// Store Creation
router.post('/store', adminController.createStore);

// Reports
router.get('/reports/orders', adminController.getOrderReports); // query param type=date|month|year
router.get('/reports/sales', adminController.getSalesReports); // query param type=date|month|year
router.get('/reports/delivery', adminController.getDeliveryReports);

// Customers
router.get('/customers', adminController.getCustomers);

// Orders
router.get('/orders', adminController.getAllOrders);
router.get('/orders/all', adminController.getAllOrders); // Alias for intuitiveness
router.delete('/orders/all', adminController.deleteAllOrders);
router.delete('/orders/:id', adminController.deleteOrder);
router.get('/orders/:id', adminController.getOrderDetails);

module.exports = router;
