// server.js (updated for Railway deployment)
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Ensure 'public/uploads' exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fsSync.existsSync(uploadDir)) {
    fsSync.mkdirSync(uploadDir, { recursive: true });
}

app.use(bodyParser.json());
app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});
const upload = multer({ storage: storage });

const db = new sqlite3.Database('ecommerce.db', (err) => {
    if (err) {
        console.error('❌ DB Connection Error:', err.message);
    } else {
        console.log('✅ Connected to DB');
        createTables();
    }
});

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
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                orderId INTEGER NOT NULL,
                productId INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                size TEXT,
                FOREIGN KEY (orderId) REFERENCES orders(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                description TEXT,
                image TEXT
            )
        `);
    });
}

function processOrder(orderData, paymentScreenshotFilename) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(
                `INSERT INTO orders (customerName, customerEmail, customerAddress, customerPhone, totalAmount, paymentScreenshot)
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
                    if (err) return reject(err);
                    const orderId = this.lastID;
                    const stmt = db.prepare(`INSERT INTO order_items (orderId, productId, quantity, size) VALUES (?, ?, ?, ?)`);
                    try {
                        if (!orderData.items || !orderData.items.length) return reject(new Error("No items in order"));
                        orderData.items.forEach(item => {
                            stmt.run(orderId, item.productId, item.quantity, item.size || '');
                        });
                        stmt.finalize();
                        resolve({ message: '✅ Order Placed Successfully!', orderId });
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    });
}

app.post('/api/orders', upload.single('paymentScreenshot'), async (req, res) => {
    try {
        const orderData = JSON.parse(req.body.orderData);
        const paymentScreenshot = req.file;

        if (!orderData.customerName || !orderData.customerEmail || !orderData.customerAddress || !orderData.customerPhone || orderData.totalAmount === undefined || !orderData.items) {
            return res.status(400).json({ error: 'Missing customer or order info.' });
        }
        if (!paymentScreenshot) {
            return res.status(400).json({ error: 'Payment screenshot is required.' });
        }

        const result = await processOrder(orderData, paymentScreenshot.filename);
        res.json(result);
    } catch (error) {
        console.error('❌ Order Error:', error);
        res.status(500).json({ error: '❌ Order failed: ' + error.message });
    }
});

app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) return res.status(500).json({ error: '❌ Error fetching products' });
        res.json(rows);
    });
});

app.get('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    db.get('SELECT * FROM products WHERE id = ?', [productId], (err, row) => {
        if (err) return res.status(500).json({ error: '❌ Error fetching product' });
        if (!row) return res.status(404).json({ error: '❌ Product not found' });
        res.json(row);
    });
});

async function cleanUpOldUploads() {
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
        console.error('❌ Cleanup error:', err);
    }
}

cleanUpOldUploads();

app.listen(port, () => {
    console.log(`✅ Server listening on http://localhost:${port}`);
});