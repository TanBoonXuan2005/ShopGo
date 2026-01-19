require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { DATABASE_URL } = process.env;

let app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

// --- DATABASE INITIALIZATION & MIGRATIONS ---
// --- DATABASE INITIALIZATION & MIGRATIONS ---
async function initDatabase() {
    const client = await pool.connect();
    try {
        console.log("Checking database schema...");

        // 1. Users Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                firebase_uid VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) NOT NULL,
                username VARCHAR(50), -- New field
                role VARCHAR(50) DEFAULT 'buyer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Migration: Ensure username exists
        try {
            await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);`);
        } catch (err) { console.log("Migration note (username):", err.message); }

        // 2. Products Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                seller_id INT REFERENCES users(id),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                image_url TEXT,
                category VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Migration: Ensure category exists
        try {
            await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100);`);
        } catch (err) { console.log("Migration note:", err.message); }

        // Migration: Ensure stock exists
        try {
            await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0;`);
        } catch (err) { console.log("Migration note (stock):", err.message); }

        // Migration: Ensure seller_id exists
        try {
            await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id INT REFERENCES users(id);`);
        } catch (err) { console.log("Migration note (seller_id):", err.message); }

        // Migration: Fix seller_id type (Convert VARCHAR to INT if needed)
        try {
            await client.query(`
               ALTER TABLE products 
               ALTER COLUMN seller_id TYPE INTEGER 
               USING seller_id::integer;
           `);
            console.log("Migration: Converted seller_id to INTEGER");
        } catch (err) {
            console.log("Migration note (seller_id conversion):", err.message);
        }

        // Migration: Ensure store_name exists for users
        try {
            await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS store_name VARCHAR(255);`);
        } catch (err) { console.log("Migration note (store_name):", err.message); }

        // Migration: Ensure store_image_url exists
        try {
            await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS store_image_url TEXT;`);
        } catch (err) { console.log("Migration note (store_image_url):", err.message); }

        // Migration: Ensure store_banner_url exists
        try {
            await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS store_banner_url TEXT;`);
        } catch (err) { console.log("Migration note (store_banner_url):", err.message); }

        try {
            await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS store_background_url TEXT;`);
        } catch (err) { console.log("Migration note (store_background_url):", err.message); }

        // Migration: Ensure discount_percentage exists
        try {
            await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percentage INT DEFAULT 0;`);
        } catch (err) { console.log("Migration note (discount_percentage):", err.message); }

        // Migration: Ensure profile_image_url exists (User Avatar)
        try {
            await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;`);
        } catch (err) { console.log("Migration note (profile_image_url):", err.message); }

        // Migration: Ensure wallet_balance exists
        try {
            await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10, 2) DEFAULT 0.00;`);
        } catch (err) { console.log("Migration note (wallet_balance):", err.message); }

        // 3. Orders Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id),
                firebase_uid VARCHAR(255),
                total_amount DECIMAL(10, 2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                shipping_address JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Order Items Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INT REFERENCES orders(id),
                product_id INT REFERENCES products(id),
                quantity INT DEFAULT 1,
                price_at_purchase DECIMAL(10, 2) NOT NULL
            );
        `);

        // Migration: Ensure payment_method exists in orders
        try {
            await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'stripe';`);
        } catch (err) { console.log("Migration note (payment_method):", err.message); }

        // 5. Reviews Table (THIS WAS MISSING)
        await client.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id),
                product_id INT REFERENCES products(id),
                rating INT CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Notifications Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Vouchers Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        discount_type VARCHAR(20) CHECK (discount_type IN ('fixed', 'percentage')),
        discount_value DECIMAL(10, 2) NOT NULL,
        min_spend DECIMAL(10, 2) DEFAULT 0,
        seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Null for Global Platform Vouchers
        usage_limit INTEGER DEFAULT 100,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // User Vouchers (Claims)
        await client.query(`
      CREATE TABLE IF NOT EXISTS user_vouchers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        voucher_id INTEGER REFERENCES vouchers(id) ON DELETE CASCADE,
        is_used BOOLEAN DEFAULT FALSE,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, voucher_id) -- User can only claim once per voucher type
      );
    `);

        // Seed some vouchers if empty
        const voucherCheck = await client.query('SELECT count(*) FROM vouchers');
        if (parseInt(voucherCheck.rows[0].count) === 0) {
            console.log("Seeding Vouchers...");
            await client.query(`
        INSERT INTO vouchers (code, description, discount_type, discount_value, min_spend, usage_limit, expires_at)
        VALUES 
        ('WELCOME10', 'RM10 off your first purchase', 'fixed', 10.00, 50.00, 1000, NOW() + INTERVAL '30 days'),
        ('FREE5', 'RM5 shipping discount', 'fixed', 5.00, 20.00, 500, NOW() + INTERVAL '7 days'),
        ('SUPER20', '20% off capped at RM50', 'percentage', 20.00, 100.00, 200, NOW() + INTERVAL '14 days');
      `);
        }

        // Migration: Snapshotting for Order Items (Prevent '0 items' on deletion)
        try {
            await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);`);
            await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_image TEXT;`);
        } catch (err) { console.log("Migration note (order_snapshot):", err.message); }


        console.log("Database schema initialized.");

    } catch (err) {
        console.error("Error initializing database:", err);
    } finally {
        client.release();
    }
}

// Run DB init on startup
initDatabase();

// --- ROUTES ---

// Register a new user
app.post("/users", async (req, res) => {
    try {
        const { firebase_uid, email, role, username } = req.body;

        if (!firebase_uid || !email || !role) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const query = `
      INSERT INTO users(firebase_uid, email, role, username)
        VALUES($1, $2, $3, $4)
      ON CONFLICT(firebase_uid) DO NOTHING
        RETURNING *;
        `;

        const newUser = await pool.query(query, [firebase_uid, email, role, username || email.split('@')[0]]);

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
        const statsRes = await pool.query(statsQuery, [id]);
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
        // Default to null if undefined to prevents SQL injection/binding errors
        const store_name = req.body.store_name || null;
        const store_image_url = req.body.store_image_url || null;
        const store_banner_url = req.body.store_banner_url || null;
        const store_background_url = req.body.store_background_url || null;

        // Use COALESCE to only update fields that are provided (if they are NOT null in the database? No, COALESCE($1, column) means if $1 is null, keep column)
        // Wait, if I pass null, it will not update? 
        // Logic: COALESCE($1, store_name). If $1 is NULL, it uses store_name (existing value).
        // This is correct for "Partial Update" logic. 
        // BUT if I want to "unset" a value (set to null), this logic prevents it.
        // However, currently we only overwrite with new images, we don't 'delete' images. So this safely handles "undefined/null" as "do not change".

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

// Helper: Seeded Random Generator for Backend
function getSeededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function calculateDailyDiscount(product) {
    // If product has a real DB discount, use it (Master Override)
    if (product.discount_percentage > 0) return product;

    // Generate Unique Daily Seed
    const todayStr = new Date().toDateString(); // "Mon Jan 19 2026"
    const todaySeed = todayStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Create stable seed from Product ID (Always use integer value)
    const prodIdNum = parseInt(product.id, 10);

    const seed = prodIdNum + todaySeed;
    const rand = getSeededRandom(seed); // 0 to 1

    // 40% Chance to be in Flash Sale
    if (rand < 0.4) {
        // Discount tiers: 10, 20, 30, 40, 50
        const discountRand = getSeededRandom(seed + 123);
        const discount = Math.floor(discountRand * 5 + 1) * 10;
        return { ...product, discount_percentage: discount };
    }

    return product;
}

// Get all products (with average rating, optional filter by seller_id)
app.get("/products", async (req, res) => {
    try {
        const { seller_id } = req.query;
        let queryText = `
            SELECT p.*,
            (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = p.id) as average_rating,
    (SELECT COUNT(id) FROM reviews WHERE product_id = p.id) as review_count,
        (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.product_id = p.id AND o.status NOT IN ('pending', 'cancelled')) as items_sold
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
                    // User not found, so no products
                    return res.json([]);
                }
            }
            queryText += ` WHERE p.seller_id = $1`;
            params.push(filterId);
        }

        queryText += ` ORDER BY p.created_at DESC; `;

        const products = await pool.query(queryText, params);

        // Apply Daily Flash Sale Logic
        const processedProducts = products.rows.map(p => calculateDailyDiscount(p));

        res.json(processedProducts);
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
             SET name = $1, description = $2, price = $3, stock = $4, category = $5, image_url = COALESCE($6, image_url), discount_percentage = COALESCE($8, discount_percentage)
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
        // For now, we trust the frontend logic or assume admin/owner access

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
            GROUP BY p.id, u.email, u.store_name, u.store_image_url, u.id;
`;
        const product = await pool.query(query, [id]);

        if (product.rows.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        // Apply Daily Flash Sale Logic
        const processedProduct = calculateDailyDiscount(product.rows[0]);

        res.json(processedProduct);
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
 * NEW: Create an Order
 * Expects: { firebase_uid, items: [{id, quantity, price}], total_amount, shipping_address }
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
            // Retrieve details to be safe, or trust frontend (trusting frontend for speed here, but validated by ID ideally)
            // We'll trust frontend 'item' has name/image or we query it. 
            // To be robust, let's query the product details for snapshotting
            const productRes = await client.query("SELECT name, image_url FROM products WHERE id = $1", [item.id]);
            const productData = productRes.rows[0];
            const name = productData ? productData.name : "Unknown Product";
            const image = productData ? productData.image_url : "";

            await client.query(
                `INSERT INTO order_items(order_id, product_id, quantity, price_at_purchase, product_name, product_image)
VALUES($1, $2, $3, $4, $5, $6)`,
                [orderId, item.id, item.quantity, item.price, name, image]
            );
        }

        await client.query('COMMIT'); // Commit Transaction

        // 6. Create Notification for Buyer
        const notificationMessage = `Order #${orderId} placed successfully.`;
        await pool.query(
            `INSERT INTO notifications(firebase_uid, title, message, type) VALUES($1, $2, $3, $4)`,
            [firebase_uid, "Order Placed", notificationMessage, "success"]
        );

        // 7. NEW: Create Notification for Seller(s)
        try {
            // Group items by seller to avoid spamming 10 notifications for 10 items
            const sellerItemsMap = {};

            // We need to fetch seller_id for each product_id
            // items array has {id, quantity, price}. id is product_id.
            // Let's query products to find owners.
            for (const item of items) {
                const prodRes = await pool.query("SELECT seller_id, name FROM products WHERE id = $1", [item.id]);
                if (prodRes.rows.length > 0) {
                    const { seller_id, name } = prodRes.rows[0];
                    if (!sellerItemsMap[seller_id]) sellerItemsMap[seller_id] = [];
                    sellerItemsMap[seller_id].push(name);
                }
            }

            // For each unique seller, send notification
            for (const [sellerId, productNames] of Object.entries(sellerItemsMap)) {
                // Get Seller Firebase UID
                const sellerUserRes = await pool.query("SELECT firebase_uid FROM users WHERE id = $1", [sellerId]);
                if (sellerUserRes.rows.length > 0) {
                    const sellerUid = sellerUserRes.rows[0].firebase_uid;
                    // Don't notify if seller bought their own item (optional check, but good UX)
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
            // Non-critical, continue
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
 * NEW: Get User Notifications
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
 * NEW: Mark Notification as Read// PUT /notifications/:id/read - Mark as read
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

// GET /vouchers: List all available vouchers for a user (claimed status optional)
// For simplicity, we list all valid vouchers. Frontend checks if claimed.
// Ideally, we return "is_claimed" flag if userId is passed.
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

// POST /vouchers/claim: Claim a voucher
app.post("/vouchers/claim", async (req, res) => {
    try {
        const { firebase_uid, voucher_id } = req.body;

        // Get user id
        const userRes = await pool.query("SELECT id FROM users WHERE firebase_uid = $1", [firebase_uid]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
        const userId = userRes.rows[0].id;

        // Check if already claimed
        const check = await pool.query("SELECT * FROM user_vouchers WHERE user_id = $1 AND voucher_id = $2", [userId, voucher_id]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Already claimed" });

        // Claim
        await pool.query("INSERT INTO user_vouchers(user_id, voucher_id) VALUES($1, $2)", [userId, voucher_id]);

        // Decrement usage logic could go here, but usage_limit usually means global limit. 
        // For now we assume limit is claim limit. 

        res.json({ message: "Voucher claimed successfully" });

    } catch (err) {
        console.error("Error claiming voucher:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * NEW: Mark ALL Notifications as Read
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
 * NEW: Get Single Order Details (for Checkout Resume)
 */
app.get("/orders/details/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get Order
        const orderRes = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
        if (orderRes.rows.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }
        const order = orderRes.rows[0];

        // 2. Get Items (Use Coalesce for Snapshot)
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
 * NEW: Get User Orders (Updated for Snapshot)
 */
app.get("/orders/:firebase_uid", async (req, res) => {
    try {
        const { firebase_uid } = req.params;

        // 1. Get Orders
        const ordersRes = await pool.query("SELECT * FROM orders WHERE firebase_uid = $1 ORDER BY created_at DESC", [firebase_uid]);
        const orders = ordersRes.rows;

        // 2. Get Items for each order
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
 * NEW: Update Order Status
 */
app.put("/orders/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // 1. Update Status
        const result = await pool.query(
            "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }

        const order = result.rows[0];

        // 2. Create Notification (Only if status actually changes to prevent duplicates)
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

            // Only send notification if we have a user to send to
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
 * NEW: Delete Order (Cancel)
 * Only allows deleting 'pending' orders
 */
app.delete("/orders/:id", async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // 1. Check Order Status
        const checkRes = await client.query("SELECT status FROM orders WHERE id = $1", [id]);
        if (checkRes.rows.length === 0) {
            throw new Error("Order not found");
        }
        if (checkRes.rows[0].status !== 'pending') {
            throw new Error("Only pending orders can be cancelled");
        }

        // 2. Delete Order Items
        await client.query("DELETE FROM order_items WHERE order_id = $1", [id]);

        // 3. Delete Order
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
 * NEW: Wallet Payment Endpoint
 * Handles balance deduction and order status update atomically
 */
app.post("/orders/pay-wallet", async (req, res) => {
    const client = await pool.connect();
    try {
        const { orderId, userId } = req.body; // userId can be firebase_uid or int id

        if (!orderId || !userId) {
            return res.status(400).json({ error: "Missing orderId or userId" });
        }

        await client.query('BEGIN'); // Start Transaction

        // 1. Get User Balance and ID (Handle FB UID vs INT)
        let userQuery = isNaN(userId)
            ? 'SELECT id, wallet_balance FROM users WHERE firebase_uid = $1 FOR UPDATE'
            : 'SELECT id, wallet_balance FROM users WHERE id = $1 FOR UPDATE';

        const userRes = await client.query(userQuery, [userId]);

        if (userRes.rows.length === 0) {
            throw new Error("User not found");
        }
        const user = userRes.rows[0];
        const currentBalance = parseFloat(user.wallet_balance || 0);

        // 2. Get Order Total
        const orderRes = await client.query("SELECT total_amount, status FROM orders WHERE id = $1", [orderId]);
        if (orderRes.rows.length === 0) {
            throw new Error("Order not found");
        }
        const order = orderRes.rows[0];
        const totalAmount = parseFloat(order.total_amount);

        // 3. Validation
        if (order.status === 'paid') {
            throw new Error("Order is already paid");
        }
        if (currentBalance < totalAmount) {
            throw new Error("Insufficient wallet balance");
        }

        // 4. Deduct Balance
        const newBalance = currentBalance - totalAmount;
        await client.query("UPDATE users SET wallet_balance = $1 WHERE id = $2", [newBalance, user.id]);

        // 5. Update Order Status
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
        // Handle Firebase UID or Integer ID
        let query = isNaN(userId)
            ? 'SELECT wallet_balance FROM users WHERE firebase_uid = $1'
            : 'SELECT wallet_balance FROM users WHERE id = $1';

        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // Return balance (default to 0 if null)
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
        // 1. Get current balance
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

        // 2. Update balance
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

        const { items, orderId } = req.body; // Expecting array of products and orderId

        if (!items || items.length === 0) {
            return res.status(400).json({ error: "No items to checkout." });
        }

        // 1. Format items for Stripe
        const lineItems = items.map((item) => ({
            price_data: {
                currency: "myr", // Change to 'usd' if preferred
                product_data: {
                    name: item.name,
                    images: item.image_url ? [item.image_url] : [],
                },
                unit_amount: Math.round(item.price * 100), // Convert to cents
            },
            quantity: item.quantity,
        }));

        // 2. Add Shipping Fee Line Item
        lineItems.push({
            price_data: {
                currency: "myr",
                product_data: {
                    name: "Shipping Fee",
                    description: "Standard Delivery",
                },
                unit_amount: 500, // RM5.00 in cents
            },
            quantity: 1,
        });

        // 3. Create Session Config
        const sessionConfig = {
            payment_method_types: req.body.paymentMethodType || ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?order_id=${orderId}`, // Pass orderId to success page
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-cancel?order_id=${orderId}`, // Clean up order on cancel
        };

        // 4. Apply Discount (if any)
        const { discountAmount } = req.body;
        if (discountAmount && parseFloat(discountAmount) > 0) {
            try {
                // Create a one-time coupon
                const coupon = await stripe.coupons.create({
                    amount_off: Math.round(parseFloat(discountAmount) * 100), // Convert to cents
                    currency: 'myr',
                    duration: 'once',
                    name: 'Voucher Discount'
                });
                sessionConfig.discounts = [{ coupon: coupon.id }];
            } catch (err) {
                console.error("Failed to create coupon:", err);
                // Proceed without discount or handle error? For checking out, maybe better to fail?
                // But let's log and proceed for now, or failing might differ user exp.
            }
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        res.json({ url: session.url });

    } catch (error) {
        console.error("Stripe Checkout Error:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});