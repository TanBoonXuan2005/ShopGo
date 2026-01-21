require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { DATABASE_URL, EMAIL_USER, EMAIL_PASS } = process.env;
const nodemailer = require("nodemailer");
const { getWelcomeEmailHtml } = require("./emailTemplates");

let app = express();
app.use(cors());
app.use(express.json());

// Fix for Neon/Postgres connection issues
let connectionString = DATABASE_URL;
if (connectionString && connectionString.includes("?")) {
    connectionString = connectionString.replace("channel_binding=require", "").replace("&&", "&");
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});

// --- ROUTES ---

// Register a new user
app.post("/users", async (req, res) => {
    try {
        const { firebase_uid, email, role, username, profile_image_url } = req.body;

        if (!firebase_uid || !email || !role) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const query = `
      INSERT INTO users(firebase_uid, email, role, username, profile_image_url)
        VALUES($1, $2, $3, $4, $5)
      ON CONFLICT(firebase_uid) DO NOTHING
        RETURNING *;
        `;

        const newUser = await pool.query(query, [
            firebase_uid,
            email,
            role,
            username || email.split('@')[0],
            profile_image_url || null
        ]);

        if (newUser.rows.length === 0) {
            const existingUser = await pool.query(
                "SELECT * FROM users WHERE firebase_uid = $1",
                [firebase_uid],
            );
            return res.json(existingUser.rows[0]);
        }

        res.json(newUser.rows[0]);
        console.log(`User registered: ${email} (${role})`);
    } catch (error) {
        console.error("Error saving user:", error);
        res.status(500).send("Server Error");
    }
});

// Seller Analytics
app.get("/seller/analytics/:uid", async (req, res) => {
    try {
        const { uid } = req.params;
        // 1. Get Seller ID
        const userRes = await pool.query("SELECT id FROM users WHERE firebase_uid = $1", [uid]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
        const sellerId = userRes.rows[0].id;

        // 2. Get Stats (Total Sales, Items Sold, Orders Count)
        const statsRes = await pool.query(`
            SELECT 
                COUNT(oi.id) as total_items_sold,
                COALESCE(SUM(oi.price_at_purchase * oi.quantity), 0) as total_revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE p.seller_id = $1 AND o.status IN ('paid', 'shipped', 'received', 'completed')
        `, [sellerId]);

        const totalOrdersRes = await pool.query(`
            SELECT COUNT(DISTINCT o.id) as total_orders
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE p.seller_id = $1 AND o.status IN ('paid', 'shipped', 'received', 'completed')
        `, [sellerId]);

        // 3. Get Top Selling Products (For Chart)
        const topProductsRes = await pool.query(`
            SELECT 
                p.id, 
                p.name, 
                COALESCE(SUM(oi.quantity), 0) as items_sold,
                COALESCE(SUM(oi.price_at_purchase * oi.quantity), 0) as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE p.seller_id = $1 AND o.status IN ('paid', 'shipped', 'received', 'completed')
            GROUP BY p.id, p.name
            ORDER BY items_sold DESC
            LIMIT 5
        `, [sellerId]);

        // 4. Get Time-Series Stats (Daily/Hourly, Weekly/Daily, Monthly/Weekly)
        const { period } = req.query; // 'weekly', 'monthly', or default 'daily'

        let dateTrunc = "HH24:00";
        let interval = "'24 hours'";

        if (period === 'weekly') {
            dateTrunc = "YYYY-MM-DD";
            interval = "'7 days'";
        } else if (period === 'monthly') {
            dateTrunc = "IYYY-IW";
            interval = "'1 month'";
        }

        // Use string interpolation for INTERVAL and TO_CHAR format
        const timeSeriesQuery = `
            SELECT 
                TO_CHAR(o.created_at, '${dateTrunc}') as date,
                COUNT(DISTINCT o.id) as orders,
                COALESCE(SUM(oi.price_at_purchase * oi.quantity), 0) as revenue
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE p.seller_id = $1 
              AND o.status IN ('paid', 'shipped', 'received', 'completed')
              AND o.created_at >= NOW() - INTERVAL ${interval}
            GROUP BY date
            ORDER BY date ASC
        `;

        const dailyStatsRes = await pool.query(timeSeriesQuery, [sellerId]);

        res.json({
            revenue: parseFloat(statsRes.rows[0].total_revenue),
            items_sold: parseInt(statsRes.rows[0].total_items_sold),
            orders_count: parseInt(totalOrdersRes.rows[0].total_orders),
            top_products: topProductsRes.rows.map(row => ({
                ...row,
                items_sold: parseInt(row.items_sold),
                revenue: parseFloat(row.revenue)
            })),
            daily_stats: dailyStatsRes.rows.map(row => ({
                date: row.date,
                orders: parseInt(row.orders),
                revenue: parseFloat(row.revenue)
            }))
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get Seller Profile (with aggregated ratings)
app.get("/sellers/:id", async (req, res) => {
    try {
        const { id } = req.params;
        let userQuery;

        // Check if id is an integer (Postgres ID) or String (Firebase UID)
        if (/^\d+$/.test(id)) {
            userQuery = `SELECT id, email, username, profile_image_url, store_name, store_image_url, store_banner_url, store_background_url, created_at FROM users WHERE id = $1`;
        } else {
            userQuery = `SELECT id, email, username, profile_image_url, store_name, store_image_url, store_banner_url, store_background_url, created_at FROM users WHERE firebase_uid = $1`;
        }

        const userRes = await pool.query(userQuery, [id]);

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: "Seller not found" });
        }

        const user = userRes.rows[0];

        // Get aggregated stats (avg rating of all their products)
        const statsQuery = `
            SELECT 
                COUNT(r.id) as total_reviews, 
                COALESCE(AVG(r.rating), 0) as average_rating 
            FROM products p 
            JOIN reviews r ON p.id = r.product_id 
            WHERE p.seller_id = $1;
        `;
        const statsRes = await pool.query(statsQuery, [user.id]);
        const stats = statsRes.rows[0];

        res.json({
            ...user,
            ...stats
        });

    } catch (error) {
        console.error("Error fetching seller profile:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// Update user profile (Store Name, Image, Banner) by Integer ID
app.put("/users/:id/profile", async (req, res) => {
    try {
        const { id } = req.params;
        const store_name = req.body.store_name || null;
        const store_image_url = req.body.store_image_url || null;
        const store_banner_url = req.body.store_banner_url || null;
        const store_background_url = req.body.store_background_url || null;

        const query = `
            UPDATE users
            SET
                store_name = COALESCE($1, store_name),
                store_image_url = COALESCE($2, store_image_url),
                store_banner_url = COALESCE($3, store_banner_url),
                store_background_url = COALESCE($4, store_background_url)
            WHERE id = $5 
            RETURNING id, email, role, store_name, store_image_url, store_banner_url, store_background_url;
        `;
        const updatedUser = await pool.query(query, [store_name, store_image_url, store_banner_url, store_background_url, id]);

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(updatedUser.rows[0]);
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// Update user role (e.g., upgrade to 'seller') and set store name
app.put("/users/:firebase_uid/role", async (req, res) => {
    try {
        const { firebase_uid } = req.params;
        const { role, store_name } = req.body;

        if (!role) {
            return res.status(400).json({ error: "Missing role" });
        }

        const query = `
            UPDATE users 
            SET role = $1, store_name = COALESCE($2, store_name)
            WHERE firebase_uid = $3
            RETURNING *;
        `;
        const updatedUser = await pool.query(query, [role, store_name, firebase_uid]);

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(updatedUser.rows[0]);
        console.log(`User ${firebase_uid} updated to role: ${role}, store_name: ${store_name || 'unchanged'} `);
    } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// Add a new product (Updated with Category)
app.post("/products", async (req, res) => {
    try {
        const { seller_id, name, description, price, image_url, category, stock } =
            req.body;

        if (!seller_id || !name || !price) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        let finalSellerId = seller_id;
        // If seller_id is not a number (e.g. Firebase UID), look up the integer ID
        if (!/^\d+$/.test(seller_id)) {
            const userRes = await pool.query("SELECT id FROM users WHERE firebase_uid = $1", [seller_id]);
            if (userRes.rows.length > 0) {
                finalSellerId = userRes.rows[0].id;
            } else {
                return res.status(400).json({ error: "Invalid seller ID" });
            }
        }

        const query = `
      INSERT INTO products(seller_id, name, description, price, image_url, category, stock, discount_percentage)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
        `;

        const newProduct = await pool.query(query, [
            finalSellerId,
            name,
            description,
            price,
            image_url,
            category,
            stock || 0,
            req.body.discount_percentage || 0
        ]);
        res.json(newProduct.rows[0]);
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// Search Suggestions Endpoint
app.get("/search-suggestions", async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json([]);

        // Case-insensitive search
        const query = `
            SELECT id, name, category 
            FROM products 
            WHERE name ILIKE $1 
            LIMIT 5
        `;
        const result = await pool.query(query, [`%${q}%`]);
        res.json(result.rows);
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

// Get all products (with average rating, optional filter by seller_id)
app.get("/products", async (req, res) => {
    try {
        const { seller_id } = req.query;
        let queryText = `
            SELECT p.*,
            (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = p.id) as average_rating,
            (SELECT COUNT(id) FROM reviews WHERE product_id = p.id) as review_count,
            (SELECT COALESCE(SUM(oi.quantity), 0)::integer FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.product_id = p.id AND o.status != 'cancelled') as items_sold
            FROM products p
        `;

        const params = [];
        if (seller_id) {
            let filterId = seller_id;
            // If seller_id is not a number (e.g. Firebase UID), look up the integer ID
            if (!/^\d+$/.test(seller_id)) {
                const userRes = await pool.query("SELECT id FROM users WHERE firebase_uid = $1", [seller_id]);
                if (userRes.rows.length > 0) {
                    filterId = userRes.rows[0].id;
                } else {
                    return res.json([]);
                }
            }
            queryText += ` WHERE p.seller_id = $1`;
            params.push(filterId);
        }

        queryText += ` ORDER BY p.created_at DESC; `;

        const products = await pool.query(queryText, params);
        res.json(products.rows);
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

// Update Product
app.put("/products/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock, category, image_url, discount_percentage } = req.body;

        const result = await pool.query(
            `UPDATE products
             SET name = $1, description = $2, price = $3, stock = $4, category = $5, image_url = COALESCE($6, image_url), discount_percentage = $8
             WHERE id = $7 RETURNING * `,
            [name, description, price, stock, category, image_url, id, discount_percentage]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// DELETE /products/:id - Delete a product
app.delete("/products/:id", async (req, res) => {
    try {
        const { id } = req.params;
        // In a real app, you should check if the requester is the owner of the product
        const deleteQuery = "DELETE FROM products WHERE id = $1 RETURNING *";
        const result = await pool.query(deleteQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// Get a single product by ID (with average rating)
app.get("/products/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT p.*,
            u.email as seller_email,
            u.store_name,
            u.store_image_url,
            u.firebase_uid as seller_firebase_uid,
            COALESCE(AVG(r.rating), 0) as average_rating,
            COUNT(r.id) as review_count,
            (
                SELECT COALESCE(AVG(r2.rating), 0)
                FROM reviews r2
                JOIN products p2 ON r2.product_id = p2.id
                WHERE p2.seller_id = p.seller_id
            ) as seller_rating
            FROM products p 
            LEFT JOIN reviews r ON p.id = r.product_id 
            LEFT JOIN users u ON p.seller_id = u.id
            WHERE p.id = $1:: integer
            GROUP BY p.id, u.email, u.store_name, u.store_image_url, u.id, u.firebase_uid;
        `;
        const product = await pool.query(query, [id]);

        if (product.rows.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.json(product.rows[0]);
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// POST /reviews: Submit a review
app.post("/reviews", async (req, res) => {
    try {
        const { firebase_uid, product_id, rating, comment } = req.body;

        if (!firebase_uid || !product_id || !rating) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const userRes = await pool.query("SELECT id FROM users WHERE firebase_uid = $1", [firebase_uid]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        const user_id = userRes.rows[0].id;

        const query = `
            INSERT INTO reviews(user_id, product_id, rating, comment)
            VALUES($1, $2, $3, $4)
            RETURNING *;
        `;
        const newReview = await pool.query(query, [user_id, product_id, rating, comment]);
        res.json(newReview.rows[0]);
    } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// GET /products/:id/reviews: Get reviews for a product
app.get("/products/:id/reviews", async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT r.*, u.email as user_email
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = $1
            ORDER BY r.created_at DESC;
        `;
        const reviews = await pool.query(query, [id]);
        res.json(reviews.rows);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

/**
 * Create an Order
 */
app.post("/orders", async (req, res) => {
    const client = await pool.connect();
    try {
        const { firebase_uid, items, total_amount, shipping_address } = req.body;

        if (!firebase_uid || !items || items.length === 0) {
            return res.status(400).json({ error: "Missing order details" });
        }

        await client.query('BEGIN'); // Start Transaction

        // 1. Get User ID from Firebase UID
        const userRes = await client.query("SELECT id FROM users WHERE firebase_uid = $1", [firebase_uid]);
        if (userRes.rows.length === 0) {
            throw new Error("User not found");
        }
        const user_id = userRes.rows[0].id;

        // 2. Create Order
        const orderQuery = `
      INSERT INTO orders(user_id, firebase_uid, total_amount, shipping_address, status, payment_method)
        VALUES($1, $2, $3, $4, 'pending', $5)
        RETURNING *;
        `;
        const orderRes = await client.query(orderQuery,
            [user_id, firebase_uid, total_amount, JSON.stringify(shipping_address), req.body.payment_method || 'stripe']
        );
        const newOrder = orderRes.rows[0];

        // 2. Create Order Items (with Snapshot)
        const orderId = newOrder.id;

        for (const item of items) {
            // Retrieve details
            const productRes = await client.query("SELECT name, image_url, stock FROM products WHERE id = $1 FOR UPDATE", [item.id]);
            const productData = productRes.rows[0];

            if (!productData) {
                throw new Error(`Product ID ${item.id} not found`);
            }

            if (productData.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${productData.name}. Available: ${productData.stock}`);
            }

            const name = productData.name;
            const image = productData.image_url;

            // Creates Order Item
            await client.query(
                `INSERT INTO order_items(order_id, product_id, quantity, price_at_purchase, product_name, product_image)
                 VALUES($1, $2, $3, $4, $5, $6)`,
                [orderId, item.id, item.quantity, item.price, name, image]
            );

            // Decrement Stock
            await client.query(
                "UPDATE products SET stock = stock - $1 WHERE id = $2",
                [item.quantity, item.id]
            );
        }

        await client.query('COMMIT'); // Commit Transaction

        // 6. Create Notification for Buyer
        const notificationMessage = `Order #${orderId} placed successfully.`;
        await pool.query(
            `INSERT INTO notifications(firebase_uid, title, message, type) VALUES($1, $2, $3, $4)`,
            [firebase_uid, "Order Placed", notificationMessage, "success"]
        );

        // 7. Create Notification for Seller(s)
        try {
            const sellerItemsMap = {};
            for (const item of items) {
                const prodRes = await pool.query("SELECT seller_id, name FROM products WHERE id = $1", [item.id]);
                if (prodRes.rows.length > 0) {
                    const { seller_id, name } = prodRes.rows[0];
                    if (!sellerItemsMap[seller_id]) sellerItemsMap[seller_id] = [];
                    sellerItemsMap[seller_id].push(name);
                }
            }

            for (const [sellerId, productNames] of Object.entries(sellerItemsMap)) {
                const sellerUserRes = await pool.query("SELECT firebase_uid FROM users WHERE id = $1", [sellerId]);
                if (sellerUserRes.rows.length > 0) {
                    const sellerUid = sellerUserRes.rows[0].firebase_uid;
                    if (sellerUid !== firebase_uid) {
                        const message = `[Seller] You have a new order for: ${productNames.join(", ")}.`;
                        await pool.query(
                            `INSERT INTO notifications(firebase_uid, title, message, type) VALUES($1, $2, $3, $4)`,
                            [sellerUid, "New Sale!", message, "info"]
                        );
                    }
                }
            }
        } catch (notifyErr) {
            console.error("Failed to notify sellers:", notifyErr);
        }

        console.log(`Order created for user ${firebase_uid}: ID ${orderId} `);
        res.status(201).json({ id: orderId, total_amount: total_amount });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error("Error creating order:", error);
        res.status(500).json({ error: error.message || "Server Error" });
    } finally {
        client.release();
    }
});

/**
 * Get User Notifications
 */
app.get("/notifications/:firebase_uid", async (req, res) => {
    try {
        const { firebase_uid } = req.params;
        const result = await pool.query(
            "SELECT * FROM notifications WHERE firebase_uid = $1 ORDER BY created_at DESC",
            [firebase_uid]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching notifications:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

/**
 * Mark Notification as Read
 */
app.put("/notifications/:id/read", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [id]);
        res.json({ message: "Marked as read" });
    } catch (err) {
        console.error("Error updating notification:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

// GET /vouchers
app.get("/vouchers", async (req, res) => {
    try {
        const { firebase_uid } = req.query;
        let query = "SELECT * FROM vouchers WHERE expires_at > NOW() AND usage_limit > 0 ORDER BY created_at DESC";

        const vouchersRes = await pool.query(query);
        let vouchers = vouchersRes.rows;

        if (firebase_uid) {
            const userRes = await pool.query("SELECT id FROM users WHERE firebase_uid = $1", [firebase_uid]);
            if (userRes.rows.length > 0) {
                const userId = userRes.rows[0].id;
                const claimsRes = await pool.query("SELECT voucher_id, is_used FROM user_vouchers WHERE user_id = $1", [userId]);
                const claimsMap = {}; // voucher_id -> is_used
                claimsRes.rows.forEach(c => claimsMap[c.voucher_id] = c.is_used);

                vouchers = vouchers.map(v => ({
                    ...v,
                    is_claimed: claimsMap.hasOwnProperty(v.id),
                    is_used: claimsMap[v.id] || false
                }));
            }
        }

        res.json(vouchers);
    } catch (err) {
        console.error("Error fetching vouchers:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// POST /vouchers/claim
app.post("/vouchers/claim", async (req, res) => {
    try {
        const { firebase_uid, voucher_id } = req.body;

        const userRes = await pool.query("SELECT id FROM users WHERE firebase_uid = $1", [firebase_uid]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
        const userId = userRes.rows[0].id;

        const check = await pool.query("SELECT * FROM user_vouchers WHERE user_id = $1 AND voucher_id = $2", [userId, voucher_id]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Already claimed" });

        await pool.query("INSERT INTO user_vouchers(user_id, voucher_id) VALUES($1, $2)", [userId, voucher_id]);

        res.json({ message: "Voucher claimed successfully" });

    } catch (err) {
        console.error("Error claiming voucher:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * Mark ALL Notifications as Read
 */
app.put("/notifications/read-all/:uid", async (req, res) => {
    try {
        const { uid } = req.params;
        await pool.query("UPDATE notifications SET is_read = TRUE WHERE firebase_uid = $1", [uid]);
        res.json({ success: true });
    } catch (err) {
        console.error("Error marking all notifications as read:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

/**
 * Get Single Order Details (for Checkout Resume)
 */
app.get("/orders/details/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const orderRes = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
        if (orderRes.rows.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }
        const order = orderRes.rows[0];

        const itemsRes = await pool.query(`
            SELECT oi.*,
            COALESCE(oi.product_name, p.name, 'Item Removed') as name,
            COALESCE(oi.product_image, p.image_url) as image_url,
            oi.price_at_purchase as price 
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
        `, [id]);

        order.items = itemsRes.rows.map(item => ({
            ...item,
            price: parseFloat(item.price)
        }));

        res.json(order);
    } catch (err) {
        console.error("Error fetching single order:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

/**
 * Get User Orders
 */
app.get("/orders/:firebase_uid", async (req, res) => {
    try {
        const { firebase_uid } = req.params;

        const ordersRes = await pool.query("SELECT * FROM orders WHERE firebase_uid = $1 ORDER BY created_at DESC", [firebase_uid]);
        const orders = ordersRes.rows;

        for (let order of orders) {
            const itemsRes = await pool.query(`
                SELECT oi.*,
                COALESCE(oi.product_name, p.name, 'Item Removed') as name,
                COALESCE(oi.product_image, p.image_url) as image_url,
                oi.price_at_purchase as price
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = $1
            `, [order.id]);

            order.items = itemsRes.rows.map(item => ({
                ...item,
                price: parseFloat(item.price)
            }));
        }

        res.json(orders);
    } catch (err) {
        console.error("Error fetching orders:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

/**
 * Update Order Status
 */
app.put("/orders/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const result = await pool.query(
            "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }

        const order = result.rows[0];

        // Create Notification (Only if status actually changes)
        if (order.status !== status) {
            let title = "Order Update";
            let message = `Your order #${id} is now ${status}.`;
            let type = "info";

            if (status === 'cancelled') {
                title = "Order Cancelled";
                message = `Your order #${id} has been cancelled.`;
                type = "warning";
            } else if (status === 'completed') {
                title = "Order Completed";
                message = `Your order #${id} is completed.Thank you for shopping with us!`;
                type = "success";
            } else if (status === 'to_ship' || status === 'paid') {
                title = "Payment Successful";
                message = `Payment for order #${id} confirmed.We will ship it soon.`;
                type = "success";
            } else if (status === 'shipped') {
                title = "Order Shipped";
                message = `Good news! Your order #${id} has been shipped and is on its way.`;
                type = "info";
            } else if (status === 'received') {
                title = "Order Received";
                message = `You have confirmed receipt of order #${id}. Don't forget to rate your items!`;
                type = "success";
            }

            if (order.firebase_uid) {
                await pool.query(
                    `INSERT INTO notifications (firebase_uid, title, message, type) 
                     VALUES ($1, $2, $3, $4)`,
                    [order.firebase_uid, title, message, type]
                );
            }
        }

        res.json(order);
    } catch (err) {
        console.error("Error updating order status:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

/**
 * Delete Order (Cancel)
 */
app.delete("/orders/:id", async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        const checkRes = await client.query("SELECT status FROM orders WHERE id = $1", [id]);
        if (checkRes.rows.length === 0) {
            throw new Error("Order not found");
        }
        if (checkRes.rows[0].status !== 'pending') {
            throw new Error("Only pending orders can be cancelled");
        }

        await client.query("DELETE FROM order_items WHERE order_id = $1", [id]);
        await client.query("DELETE FROM orders WHERE id = $1", [id]);

        await client.query('COMMIT');
        res.json({ message: "Order cancelled successfully" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error cancelling order:", err);
        res.status(400).json({ error: err.message || "Server Error" });
    } finally {
        client.release();
    }
});

/**
 * Wallet Payment Endpoint
 */
app.post("/orders/pay-wallet", async (req, res) => {
    const client = await pool.connect();
    try {
        const { orderId, userId } = req.body;

        if (!orderId || !userId) {
            return res.status(400).json({ error: "Missing orderId or userId" });
        }

        await client.query('BEGIN');

        let userQuery = isNaN(userId)
            ? 'SELECT id, wallet_balance FROM users WHERE firebase_uid = $1 FOR UPDATE'
            : 'SELECT id, wallet_balance FROM users WHERE id = $1 FOR UPDATE';

        const userRes = await client.query(userQuery, [userId]);

        if (userRes.rows.length === 0) {
            throw new Error("User not found");
        }
        const user = userRes.rows[0];
        const currentBalance = parseFloat(user.wallet_balance || 0);

        const orderRes = await client.query("SELECT total_amount, status FROM orders WHERE id = $1", [orderId]);
        if (orderRes.rows.length === 0) {
            throw new Error("Order not found");
        }
        const order = orderRes.rows[0];
        const totalAmount = parseFloat(order.total_amount);

        if (order.status === 'paid') {
            throw new Error("Order is already paid");
        }
        if (currentBalance < totalAmount) {
            throw new Error("Insufficient wallet balance");
        }

        const newBalance = currentBalance - totalAmount;
        await client.query("UPDATE users SET wallet_balance = $1 WHERE id = $2", [newBalance, user.id]);

        const updateOrderRes = await client.query(
            "UPDATE orders SET status = 'paid' WHERE id = $1 RETURNING *",
            [orderId]
        );

        await client.query('COMMIT');

        console.log(`Wallet Payment Success: User ${user.id} paid ${totalAmount} for Order ${orderId}`);
        res.json({ success: true, order: updateOrderRes.rows[0], newBalance });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Wallet Payment Error:", error);
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
});

// --- WALLET ENDPOINTS ---

// GET Wallet Balance
app.get('/wallet/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        let query = isNaN(userId)
            ? 'SELECT wallet_balance FROM users WHERE firebase_uid = $1'
            : 'SELECT wallet_balance FROM users WHERE id = $1';

        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const balance = parseFloat(result.rows[0].wallet_balance || 0);
        res.json({ balance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch wallet balance" });
    }
});

// POST Top Up Wallet
app.post('/wallet/topup', async (req, res) => {
    const { userId, amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
    }

    try {
        let findUserQuery = isNaN(userId)
            ? 'SELECT id, wallet_balance FROM users WHERE firebase_uid = $1'
            : 'SELECT id, wallet_balance FROM users WHERE id = $1';

        const userRes = await pool.query(findUserQuery, [userId]);

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = userRes.rows[0];
        const currentBalance = parseFloat(user.wallet_balance || 0);
        const newBalance = currentBalance + parseFloat(amount);

        await pool.query('UPDATE users SET wallet_balance = $1 WHERE id = $2', [newBalance, user.id]);

        res.json({
            success: true,
            message: "Top up successful",
            newBalance: newBalance.toFixed(2)
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to top up wallet" });
    }
});

// --- AI CHATBOT ENDPOINT ---
app.post("/chat", async (req, res) => {
    try {
        const { message } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Missing Gemini API Key");
            return res.status(500).json({ reply: "I'm not configured correctly yet (Missing API Key)." });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const systemPrompt = "You are a helpful, friendly AI assistant for 'ShopGo', a premium e-commerce store. Answer questions about products, shipping (3-5 days), and general support. Keep answers concise and polite. Do not hallucinate products.";

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${systemPrompt}\n\nUser: ${message}\nAssistant:`
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Gemini API Error Body:", errorBody);
            throw new Error(`Gemini API Error: ${response.statusText} (${response.status})`);
        }

        const data = await response.json();
        const reply = data.candidates[0].content.parts[0].text;

        res.json({ reply });

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ reply: "Sorry, I'm having trouble thinking right now." });
    }
});

// --- STRIPE PAYMENT ENDPOINT ---
const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
    console.warn("⚠️  WARNING: STRIPE_SECRET_KEY is missing. Payment endpoints will fail.");
}

const stripe = stripeSecret ? require("stripe")(stripeSecret) : null;

app.post("/create-checkout-session", async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({ error: "Stripe is not configured." });
        }

        const { items, orderId } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: "No items to checkout." });
        }

        const lineItems = items.map((item) => ({
            price_data: {
                currency: "myr",
                product_data: {
                    name: item.name,
                    images: item.image_url ? [item.image_url] : [],
                },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
        }));

        lineItems.push({
            price_data: {
                currency: "myr",
                product_data: {
                    name: "Shipping Fee",
                    description: "Standard Delivery",
                },
                unit_amount: 500,
            },
            quantity: 1,
        });

        const sessionConfig = {
            payment_method_types: req.body.paymentMethodType || ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?order_id=${orderId}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-cancel?order_id=${orderId}`,
        };

        const { discountAmount } = req.body;
        if (discountAmount && parseFloat(discountAmount) > 0) {
            try {
                const coupon = await stripe.coupons.create({
                    amount_off: Math.round(parseFloat(discountAmount) * 100),
                    currency: 'myr',
                    duration: 'once',
                    name: 'Voucher Discount'
                });
                sessionConfig.discounts = [{ coupon: coupon.id }];
            } catch (err) {
                console.error("Failed to create coupon:", err);
            }
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        res.json({ url: session.url });

    } catch (error) {
        console.error("Stripe Checkout Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- SUBSCRIBE NEWSLETTER ENDPOINT ---
app.post("/subscribe", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email required" });

        if (!EMAIL_USER || !EMAIL_PASS) {
            console.warn("⚠️  Email credentials missing in .env. Email NOT sent.");
            return res.json({ message: "Subscribed (Email skipped due to config)" });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `"ShopGo Team" <${EMAIL_USER}>`,
            to: email,
            subject: "Welcome to the ShopGo Community! 🎉",
            html: getWelcomeEmailHtml()
        };

        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to: ${email}`);
        res.json({ message: "Welcome email sent" });

    } catch (error) {
        console.error("Email Error:", error);
        res.status(200).json({ message: "Subscribed (Email failed)" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});