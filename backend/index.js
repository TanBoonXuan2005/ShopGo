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
                role VARCHAR(50) DEFAULT 'buyer', -- Changed default to 'buyer' to be safe
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

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

        // Migration: Ensure seller_id exists
        try {
            await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id INT REFERENCES users(id);`);
        } catch (err) { console.log("Migration note (seller_id):", err.message); }

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
        const { firebase_uid, email, role } = req.body;

        if (!firebase_uid || !email || !role) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const query = `
      INSERT INTO users (firebase_uid, email, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (firebase_uid) DO NOTHING
      RETURNING *;
    `;

        const newUser = await pool.query(query, [firebase_uid, email, role]);

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

// Update user role (e.g., upgrade to 'seller')
app.put("/users/:firebase_uid/role", async (req, res) => {
    try {
        const { firebase_uid } = req.params;
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({ error: "Missing role" });
        }

        const query = `
            UPDATE users 
            SET role = $1 
            WHERE firebase_uid = $2 
            RETURNING *;
        `;
        const updatedUser = await pool.query(query, [role, firebase_uid]);

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(updatedUser.rows[0]);
        console.log(`User ${firebase_uid} updated to role: ${role}`);
    } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// Add a new product (Updated with Category)
app.post("/products", async (req, res) => {
    try {
        const { seller_id, name, description, price, image_url, category } =
            req.body;

        if (!seller_id || !name || !price) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const query = `
      INSERT INTO products (seller_id, name, description, price, image_url, category)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

        const newProduct = await pool.query(query, [
            seller_id,
            name,
            description,
            price,
            image_url,
            category,
        ]);
        res.json(newProduct.rows[0]);
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// Get all products (with average rating)
app.get("/products", async (req, res) => {
    try {
        const query = `
            SELECT p.*, 
                   COALESCE(AVG(r.rating), 0) as average_rating, 
                   COUNT(r.id) as review_count 
            FROM products p 
            LEFT JOIN reviews r ON p.id = r.product_id 
            GROUP BY p.id 
            ORDER BY p.created_at DESC;
        `;
        const products = await pool.query(query);
        res.json(products.rows);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// Get a single product by ID (with average rating)
app.get("/products/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT p.*, u.email as seller_email,
                   COALESCE(AVG(r.rating), 0) as average_rating, 
                   COUNT(r.id) as review_count 
            FROM products p 
            LEFT JOIN reviews r ON p.id = r.product_id 
            LEFT JOIN users u ON p.seller_id = u.id
            WHERE p.id = $1
            GROUP BY p.id, u.email;
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
            INSERT INTO reviews (user_id, product_id, rating, comment)
            VALUES ($1, $2, $3, $4)
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
      INSERT INTO orders (user_id, firebase_uid, total_amount, shipping_address, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *;
    `;
        const orderRes = await client.query(orderQuery, [user_id, firebase_uid, total_amount, JSON.stringify(shipping_address)]);
        const newOrder = orderRes.rows[0];

        // 3. Create Order Items
        for (const item of items) {
            await client.query(`
         INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
         VALUES ($1, $2, $3, $4)
       `, [newOrder.id, item.id, item.quantity, item.price]);
        }

        await client.query('COMMIT'); // Commit Transaction

        console.log(`Order created for user ${firebase_uid}: ID ${newOrder.id}`);
        res.status(201).json(newOrder);

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error("Error creating order:", error);
        res.status(500).json({ error: error.message || "Server Error" });
    } finally {
        client.release();
    }
});

/**
 * NEW: Get User Orders
 */
app.get("/orders/:firebase_uid", async (req, res) => {
    try {
        const { firebase_uid } = req.params;

        // Fetch orders and their items (grouped)
        // Simple approach: Get orders first
        const ordersRes = await pool.query(
            "SELECT * FROM orders WHERE firebase_uid = $1 ORDER BY created_at DESC",
            [firebase_uid]
        );
        const orders = ordersRes.rows;

        // For each order, get items (Not most efficient for n+1 but fine for MVP)
        for (let order of orders) {
            const itemsRes = await pool.query(`
                SELECT oi.*, p.name, p.image_url 
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = $1
             `, [order.id]);
            order.items = itemsRes.rows;
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

        const result = await pool.query(
            "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating order status:", err);
        res.status(500).json({ error: "Server Error" });
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

        // 3. Create Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: `http://localhost:5173/success?order_id=${orderId}`, // Pass orderId to success page
            cancel_url: "http://localhost:5173/",
        });

        res.json({ url: session.url });

    } catch (error) {
        console.error("Stripe Checkout Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
