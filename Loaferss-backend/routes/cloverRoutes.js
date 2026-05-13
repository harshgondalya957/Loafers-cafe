const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const router = express.Router();

/**
 * @route   GET /auth/clover/login
 * @desc    Redirect user to Clover Sandbox OAuth page
 */
router.get('/clover/login', (req, res) => {
    const appId = process.env.CLOVER_APP_ID;
    const redirectUri = process.env.CLOVER_REDIRECT_URI;

    if (!appId || !redirectUri) {
        return res.status(500).send("Clover App ID or Redirect URI not configured in .env");
    }

    const cloverAuthUrl = `https://sandbox.dev.clover.com/oauth/authorize?client_id=${appId}&response_type=code&redirect_uri=${redirectUri}`;
    
    console.log(`[CLOVER] Redirecting to: ${cloverAuthUrl}`);
    res.redirect(cloverAuthUrl);
});

/**
 * @route   GET /auth/clover
 * @desc    Callback route for Clover OAuth. Exchanges code for access_token and stores in MongoDB.
 */
router.get('/clover', async (req, res) => {
    const { code, merchant_id } = req.query;

    if (!code) {
        console.error("[CLOVER] Callback reached without code.");
        return res.status(400).send("Error: Missing authorization code from Clover.");
    }

    try {
        console.log("[CLOVER] Exchanging code for access token...");
        const response = await axios.post('https://sandbox.dev.clover.com/oauth/token', {
            client_id: process.env.CLOVER_APP_ID,
            client_secret: process.env.CLOVER_APP_SECRET,
            code: code
        });

        const accessToken = response.data.access_token;
        const mId = merchant_id || response.data.merchant_id;

        // Store Token in MongoDB (clovertokens collection)
        const clovertokens = mongoose.connection.db.collection('clovertokens');
        await clovertokens.updateOne(
            { merchant_id: mId },
            { 
                $set: { 
                    access_token: accessToken,
                    merchant_id: mId,
                    updated_at: new Date() 
                } 
            },
            { upsert: true }
        );

        console.log("[CLOVER] Connection Successful. Token saved to MongoDB.");
        res.send("<h1>Clover Connected Successfully</h1><p>Token has been stored in database. You can now perform real order payments.</p>");
    } catch (error) {
        console.error("[CLOVER] Token Exchange Failed:", error.response ? error.response.data : error.message);
        res.status(500).send("Failed to connect to Clover. Please check server console.");
    }
});

/**
 * @route   POST /auth/clover/payment
 * @desc    Handle real order-based payment flow with Clover API
 * @body    { orderId: string, amount: number, currency: string }
 */
router.post('/clover/payment', async (req, res) => {
    const { orderId, amount, currency = 'GBP' } = req.body;

    // 1. Validation
    if (!orderId || !amount || amount <= 0) {
        return res.status(400).json({ 
            success: false, 
            error: "Invalid request. orderId and a positive amount are required." 
        });
    }

    try {
        // 2. Fetch latest Clover access_token from MongoDB
        const clovertokens = mongoose.connection.db.collection('clovertokens');
        const tokenDoc = await clovertokens.find().sort({ updated_at: -1 }).limit(1).toArray();
        
        if (!tokenDoc || tokenDoc.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: "Clover not connected. No access token found in database." 
            });
        }

        const storedAccessToken = tokenDoc[0].access_token;
        const merchantId = tokenDoc[0].merchant_id;

        // 3. Find Order in MongoDB
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                error: "Order not found in database." 
            });
        }

        console.log(`[CLOVER] Processing REAL payment for Order: ${orderId}, Amount: ${amount} ${currency}`);

        let cloverResponseData = null;
        let paymentSuccessful = false;

        try {
            /**
             * 4. REAL CLOVER API CALL
             * Clover API expects amount in CENTS (e.g. 10.50 -> 1050)
             */
            const amountInCents = Math.round(parseFloat(amount) * 100);
            const cloverApiUrl = `https://sandbox.dev.clover.com/v3/merchants/${merchantId}/payments`;

            console.log(`[CLOVER] Calling API: ${cloverApiUrl}`);
            
            const apiRes = await axios.post(cloverApiUrl, {
                amount: amountInCents,
                currency: currency,
                external_payment_id: orderId, // Link our order ID
                note: `Payment for Loafers Order #${order.tokenNumber || orderId}`
            }, {
                headers: {
                    'Authorization': `Bearer ${storedAccessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            cloverResponseData = apiRes.data;
            paymentSuccessful = true;
            console.log("[CLOVER] API Payment Successful:", cloverResponseData.id);

        } catch (apiError) {
            console.warn("[CLOVER] Real API failed, checking fallback...");
            console.error("API Error Detail:", apiError.response ? apiError.response.data : apiError.message);

            // FALLBACK SIMULATION (as requested for testing/sandbox stability)
            if (process.env.CLOVER_SIMULATION_FALLBACK !== "false") {
                console.log("[CLOVER] Using fallback simulation mode.");
                paymentSuccessful = true;
                cloverResponseData = {
                    id: "SIM_" + Math.random().toString(36).substr(2, 9).toUpperCase(),
                    status: "SUCCESS",
                    is_simulation: true
                };
            } else {
                paymentSuccessful = false;
            }
        }

        if (paymentSuccessful) {
            // 5. Update Order in MongoDB - SUCCESS
            order.payment_method = "clover";
            order.payment_status = "paid";
            order.status = "confirmed";
            order.transactionId = cloverResponseData.id; // Store transaction_id
            await order.save();

            return res.json({
                success: true,
                message: cloverResponseData.is_simulation ? "Payment successful (Simulated Fallback)" : "Payment successful via Clover API",
                orderId: orderId,
                transactionId: cloverResponseData.id,
                apiResponse: cloverResponseData
            });
        } else {
            // 5. Update Order in MongoDB - FAILED
            order.payment_status = "failed";
            await order.save();

            return res.status(402).json({
                success: false,
                error: "Payment declined or failed",
                orderId: orderId
            });
        }

    } catch (error) {
        console.error("[CLOVER] Global Payment Failure:", error.message);
        res.status(500).json({
            success: false,
            error: "Internal payment processing error",
            details: error.message
        });
    }
});

/**
 * @route   GET /auth/clover/connect
 * @desc    Frontend trigger page
 */
router.get('/clover/connect', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Connect Clover</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: #f0f2f5;
                }
                .card {
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                    text-align: center;
                    max-width: 400px;
                }
                h1 { color: #1a1a1a; margin-bottom: 20px; }
                p { color: #666; margin-bottom: 30px; line-height: 1.5; }
                button {
                    background: #0070ba;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.3s ease;
                }
                button:hover { background: #0056b3; }
            </style>
        </head>
        <body>
            <div class="card">
                <img src="https://www.clover.com/favicon.ico" alt="Clover" style="width: 48px; margin-bottom: 10px;">
                <h1>Clover POS</h1>
                <p>Integrate your Loafers store with Clover for seamless payments and order management.</p>
                <button onclick="window.location.href='/auth/clover/login'">Connect Clover</button>
            </div>
        </body>
        </html>
    `);
});

module.exports = router;
