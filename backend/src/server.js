require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./utils/swagger');
const { connectDB } = require('./models/db');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const userRoutes         = require('./routes/userRoutes');
const consentRoutes      = require('./routes/consentRoutes');
const productOrderRoutes = require('./routes/productOrderRoutes');
const adminRoutes        = require('./routes/adminRoutes');
const auditFeedRoutes    = require('./routes/auditFeedRoutes');

const app  = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/users',      userRoutes);
app.use('/api/consents',   consentRoutes);
app.use('/api',            productOrderRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/audit-feed', auditFeedRoutes);

// ── Swagger Docs ──────────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'DemoApp', version: '1.0.0' }));

// ── Start ─────────────────────────────────────────────────────────────────────
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`[DemoApp] Backend running on http://localhost:${PORT}`);
        console.log(`[DemoApp] Swagger docs at http://localhost:${PORT}/api-docs`);
    });
});
