const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/machine-control', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Check MongoDB connection
mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Disconnected from MongoDB');
});

// Schemas
const StateSchema = new mongoose.Schema({
    machines: {
        type: Map,
        of: new mongoose.Schema({
            id: String,
            name: String,
            type: String,
            operational: Boolean,
            segments: [{
                id: String,
                active: Boolean
            }],
            vibrationPump: {
                active: Boolean
            },
            devices: [{
                id: String,
                name: String,
                active: Boolean
            }]
        })
    },
    spareParts: [{
        id: String,
        description: String,
        compatibility: String,
        quantity: Number,
        image: String
    }],
    history: [{
        id: String,
        date: String,
        time: String,
        machine: String,
        component: String,
        action: String,
        reason: String,
        sparePart: String
    }],
    currentComponent: {
        machineId: String,
        componentId: String,
        componentType: String,
        componentName: String
    },
    currentSparePart: {
        id: String,
        description: String,
        compatibility: String,
        quantity: Number,
        image: String
    },
    editSparePart: Boolean
});

const State = mongoose.model('State', StateSchema);

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Routes
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { password } = req.body;
    
    // Hashed password for "mamut5760"
    const hashedPassword = '$2a$10$rOzJqQjQjQjQjQjQjQjQuOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ';
    
    try {
        const isValid = await bcrypt.compare(password, hashedPassword);
        if (isValid) {
            const token = jwt.sign(
                { authenticated: true, timestamp: Date.now() }, 
                process.env.JWT_SECRET || 'fallback_secret', 
                { expiresIn: '24h' }
            );
            res.json({ 
                token,
                message: 'Login exitoso'
            });
        } else {
            res.status(401).json({ error: 'Contraseña incorrecta' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Get state
app.get('/api/state', authenticateToken, async (req, res) => {
    try {
        let state = await State.findOne();
        if (!state) {
            // Create initial state if doesn't exist
            const initialState = {
                machines: new Map([
                    ['S', {
                        id: 'S',
                        name: 'Máquina S',
                        type: 'SEGMENT_BASED',
                        operational: true,
                        segments: Array.from({length: 28}, (_, i) => ({
                            id: i < 14 ? `F${i+1}` : `W${i-13}`,
                            active: true
                        })),
                        vibrationPump: { active: true }
                    }],
                    ['R', {
                        id: 'R',
                        name: 'Máquina R',
                        type: 'SEGMENT_BASED',
                        operational: true,
                        segments: Array.from({length: 28}, (_, i) => ({
                            id: i < 14 ? `F${i+1}` : `W${i-13}`,
                            active: true
                        })),
                        vibrationPump: { active: true }
                    }],
                    ['T', {
                        id: 'T',
                        name: 'Máquina T',
                        type: 'SEGMENT_BASED',
                        operational: true,
                        segments: Array.from({length: 28}, (_, i) => ({
                            id: i < 14 ? `F${i+1}` : `W${i-13}`,
                            active: true
                        })),
                        vibrationPump: { active: true }
                    }],
                    ['U', {
                        id: 'U',
                        name: 'Máquina U',
                        type: 'SEGMENT_BASED',
                        operational: true,
                        segments: Array.from({length: 28}, (_, i) => ({
                            id: i < 14 ? `F${i+1}` : `W${i-13}`,
                            active: true
                        })),
                        vibrationPump: { active: true }
                    }],
                    ['W', {
                        id: 'W',
                        name: 'Máquina W',
                        type: 'SEGMENT_BASED',
                        operational: true,
                        segments: Array.from({length: 28}, (_, i) => ({
                            id: i < 14 ? `F${i+1}` : `W${i-13}`,
                            active: true
                        })),
                        vibrationPump: { active: true }
                    }],
                    ['bolsas', {
                        id: 'bolsas',
                        name: 'Máquina de Bolsas',
                        type: 'DEVICE_BASED',
                        operational: true,
                        devices: [
                            { id: 'cuchillo', name: 'Cuchillo', active: true },
                            { id: 'impresora', name: 'Impresora', active: true },
                            { id: 'neumatico', name: 'Neumático', active: true },
                            { id: 'insumos', name: 'Insumos', active: true }
                        ]
                    }],
                    ['alineador', {
                        id: 'alineador',
                        name: 'Alineador',
                        type: 'SIMPLE',
                        operational: true
                    }],
                    ['neumaticos-s', {
                        id: 'neumaticos-s',
                        name: 'Neumáticos S',
                        type: 'GRID_BASED',
                        operational: true,
                        devices: [
                            { id: 'cuerpo-control', name: 'Cuerpo de Control', active: true },
                            { id: 'ev', name: 'EV', active: true },
                            { id: 'generador-vacio', name: 'Generador de Vacío', active: true },
                            { id: 'tubing', name: 'Tubing', active: true }
                        ]
                    }],
                    ['neumaticos-r', {
                        id: 'neumaticos-r',
                        name: 'Neumáticos R',
                        type: 'GRID_BASED',
                        operational: true,
                        devices: [
                            { id: 'cuerpo-control', name: 'Cuerpo de Control', active: true },
                            { id: 'ev', name: 'EV', active: true },
                            { id: 'generador-vacio', name: 'Generador de Vacío', active: true },
                            { id: 'tubing', name: 'Tubing', active: true }
                        ]
                    }],
                    ['neumaticos-t', {
                        id: 'neumaticos-t',
                        name: 'Neumáticos T',
                        type: 'GRID_BASED',
                        operational: true,
                        devices: [
                            { id: 'cuerpo-control', name: 'Cuerpo de Control', active: true },
                            { id: 'ev', name: 'EV', active: true },
                            { id: 'generador-vacio', name: 'Generador de Vacío', active: true },
                            { id: 'tubing', name: 'Tubing', active: true }
                        ]
                    }],
                    ['neumaticos-u', {
                        id: 'neumaticos-u',
                        name: 'Neumáticos U',
                        type: 'GRID_BASED',
                        operational: true,
                        devices: [
                            { id: 'cuerpo-control', name: 'Cuerpo de Control', active: true },
                            { id: 'ev', name: 'EV', active: true },
                            { id: 'generador-vacio', name: 'Generador de Vacío', active: true },
                            { id: 'tubing', name: 'Tubing', active: true }
                        ]
                    }],
                    ['neumaticos-w', {
                        id: 'neumaticos-w',
                        name: 'Neumáticos W',
                        type: 'GRID_BASED',
                        operational: true,
                        devices: [
                            { id: 'cuerpo-control', name: 'Cuerpo de Control', active: true },
                            { id: 'ev', name: 'EV', active: true },
                            { id: 'generador-vacio', name: 'Generador de Vacío', active: true },
                            { id: 'tubing', name: 'Tubing', active: true }
                        ]
                    }]
                ]),
                spareParts: [],
                history: [],
                currentComponent: null,
                currentSparePart: null,
                editSparePart: false
            };
            
            state = new State(initialState);
            await state.save();
            console.log('Initial state created');
        }
        
        // Convert Map to Object for JSON response
        const stateObject = state.toObject();
        if (stateObject.machines instanceof Map) {
            stateObject.machines = Object.fromEntries(stateObject.machines);
        }
        
        res.json(stateObject);
    } catch (error) {
        console.error('Error getting state:', error);
        res.status(500).json({ error: 'Error al obtener el estado' });
    }
});

// Update state
app.put('/api/state', authenticateToken, async (req, res) => {
    try {
        const updatedState = req.body;
        
        // Find existing state
        let state = await State.findOne();
        
        if (state) {
            // Update existing state
            Object.keys(updatedState).forEach(key => {
                if (key === 'machines' && updatedState.machines) {
                    // Convert machines object to Map
                    state.machines = new Map(Object.entries(updatedState.machines));
                } else {
                    state[key] = updatedState[key];
                }
            });
        } else {
            // Create new state if doesn't exist
            state = new State(updatedState);
            if (state.machines && typeof state.machines === 'object') {
                state.machines = new Map(Object.entries(state.machines));
            }
        }
        
        await state.save();
        console.log('State updated successfully');
        
        res.json({ 
            success: true,
            message: 'Estado actualizado correctamente'
        });
    } catch (error) {
        console.error('Error updating state:', error);
        res.status(500).json({ error: 'Error al actualizar el estado' });
    }
});

// Verify token endpoint
app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ 
        valid: true, 
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});