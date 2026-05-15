const express = require('express');
const helmet = require('helmet')
const morgan = require('morgan')
const cors = require('cors')

// Import routes
// const authRoutes = require('./routes/auth');
// const customerRoutes = require('./routes/customers');
// const orderRoutes = require('./routes/orders');
// const deliveryRoutes = require('./routes/deliveries');

const app = express()

// Middlewares
app.use(express.json())
app.use(cors())
app.use(helmet())
app.use(morgan('combined'))

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Rugori Backend API' });
})

module.exports = app;
