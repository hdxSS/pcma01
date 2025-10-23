const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (your index.html)
app.use(express.static(__dirname));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/machine-control', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Schemas (same as before)
const StateSchema = new mongoose.Schema({
    machines: { type: Map, of: Object },
    spareParts: [Object],
    history: [Object],
    currentComponent: Object,
    currentSparePart: Object,
    editSparePart: Boolean
});

const State = mongoose.model('State', StateSchema);

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    
    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

// API Routes
app.post('/api/login', async (req, res) => {
    const { password } = req.body;
    const hashedPassword = '$2a$10$rOzJqQjQjQjQjQjQjQjQuOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ';
    
    try {
        const isValid = await bcrypt.compare(password, hashedPassword);
        if (isValid) {
            const token = jwt.sign({ authenticated: true }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '24h' });
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Contraseña incorrecta' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.get('/api/state', authenticateToken, async (req, res) => {
    try {
        let state = await State.findOne();
        if (!state) {
            // Create initial state
            state = new State({
                machines: new Map(),
                spareParts: [],
                history: [],
                currentComponent: null,
                currentSparePart: null,
                editSparePart: false
            });
            await state.save();
        }
        
        const stateObject = state.toObject();
        if (stateObject.machines instanceof Map) {
            stateObject.machines = Object.fromEntries(stateObject.machines);
        }
        res.json(stateObject);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el estado' });
    }
});

app.put('/api/state', authenticateToken, async (req, res) => {
    try {
        let state = await State.findOne();
        if (state) {
            Object.keys(req.body).forEach(key => {
                if (key === 'machines') {
                    state.machines = new Map(Object.entries(req.body[key]));
                } else {
                    state[key] = req.body[key];
                }
            });
        } else {
            state = new State(req.body);
            if (state.machines && typeof state.machines === 'object') {
                state.machines = new Map(Object.entries(state.machines));
            }
        }
        await state.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el estado' });
    }
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});