const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'public', 'uploads');
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});
const upload = multer({ storage: storage });

// Database connection
const db = new sqlite3.Database('ecommerce.db', (err) => {
    if (err) {
        console.error('❌ DB Connection Error:', err.message);
    } else {
        console.log('✅ Connected to DB');
        createTables();
    }
});

// Table creation
function createTables() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customerName TEXT NOT NULL,
                customerEmail TEXT NOT NULL,
                customerAddress TEXT NOT NULL,
                customerPhone TEXT NOT NULL,
                totalAmount REAL NOT NULL,
                paymentScreenshot TEXT NOT NULL,
                orderDate DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('❌ Orders Table Error:', err.message);
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                orderId INTEGER NOT NULL,
                productId INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                size TEXT,
                FOREIGN KEY (orderId) REFERENCES orders(id)
            )
        `, (err) => {
            if (err) console.error('❌ Order Items Table Error:', err.message);
        });
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                description TEXT,
                image TEXT
            )
        `, (err) => {
            if (err) console.error('❌ Products Table Error:', err.message);
        });
    });
}

// Function to process the order and store data in the database
function processOrder(orderData, paymentScreenshotFilename) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // 1. Insert into the 'orders' table
            db.run(
                `INSERT INTO orders
                 (customerName, customerEmail, customerAddress, customerPhone, totalAmount, paymentScreenshot)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    orderData.customerName,
                    orderData.customerEmail,
                    orderData.customerAddress,
                    orderData.customerPhone,
                    orderData.totalAmount,
                    paymentScreenshotFilename
                ],
                function (err) {
                    if (err) {
                        console.error('❌ Orders Insert Error:', err.message);
                        return reject(err);
                    }

                    const orderId = this.lastID;

                    // 2. Insert into the 'order_items' table
                    const stmt = db.prepare(`INSERT INTO order_items (orderId, productId, quantity, size) VALUES (?, ?, ?, ?)`);
                    try {
                        const cartItems = orderData.items;
                        if (!cartItems || cartItems.length === 0) {
                            return reject(new Error("❌ No items in cartItems array"));
                        }
                        cartItems.forEach(item => {
                            stmt.run(orderId, item.productId, item.quantity, item.size || '');
                        });
                        stmt.finalize();

                        // 3. Resolve the promise with the order confirmation data
                        resolve({ message: '✅ Order Placed Successfully!', orderId: orderId });
                    } catch (error) {
                        console.error('❌ Order Items Insert Error:', error.message);
                        return reject(error);
                    }
                }
            );
        });
    });
}

// API endpoint for orders
app.post('/api/orders', upload.single('paymentScreenshot'), async (req, res) => {
    console.log('-------------------');
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);
    console.log('-------------------');
    try {
        // 1. Parse the order data from the request body
        const orderData = JSON.parse(req.body.orderData);

        // 2. Extract the payment screenshot file
        const paymentScreenshot = req.file;

        // 3.  Validation
        if (!orderData.customerName || !orderData.customerEmail || !orderData.customerAddress || !orderData.customerPhone || orderData.totalAmount === undefined || !orderData.items) {
            return res.status(400).json({ error: '❌ Missing customer or order information.' });
        }
        if (!paymentScreenshot) {
            return res.status(400).json({ error: '❌ Payment screenshot is required.' });
        }
        if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
            return res.status(400).json({ error: '❌ Invalid or empty order items.' });
        }

        // 4. Process the order and get the result
        const orderResult = await processOrder(orderData, paymentScreenshot.filename);

        // 5. Send the response back to the client
        res.json(orderResult);
    } catch (error) {
        console.error('❌ Order Processing Error:', error);
        res.status(500).json({ error: '❌ Order failed: ' + error.message });
    }
});

// Get all products
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching products:', err.message);
            return res.status(500).json({ error: '❌ Error fetching products' });
        }
        res.json(rows);
    });
});

// Get a single product by ID
app.get('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    db.get('SELECT * FROM products WHERE id = ?', [productId], (err, row) => {
        if (err) {
            console.error('❌ Error fetching product:', err.message);
            return res.status(500).json({ error: '❌ Error fetching product' });
        }
        if (!row) {
            return res.status(404).json({ error: '❌ Product not found' });
        }
        res.json(row);
    });
});

// Clean up old uploaded files
async function cleanUpOldUploads() {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    try {
        const files = await fs.readdir(uploadDir);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000;
        for (const file of files) {
            const filePath = path.join(uploadDir, file);
            const stats = await fs.stat(filePath);
            if (stats.isFile() && (now - stats.mtimeMs > maxAge) && file.startsWith('paymentScreenshot-')) {
                await fs.unlink(filePath);
                console.log(`🧹 Deleted old upload: ${file}`);
            }
        }
    } catch (err) {
        console.error('❌ Error cleaning up uploads:', err);
    }
}

// Call the cleanup function
cleanUpOldUploads();

// Start the server
app.listen(port, () => {
    console.log(`✅ Server listening at http://localhost:${port}`);
});