// src/index.ts
import express, { Application, Request, Response } from 'express';
import cors from 'cors';

// Import routes
import bookingsRouter from './routes/bookings.js';
import usersRouter from './routes/users.js';
import eventsRouter from './routes/events.js';
import enablersRouter from './routes/enablers.js';

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/bookings', bookingsRouter);
app.use('/users', usersRouter);
app.use('/events', eventsRouter);
app.use('/enablers', enablersRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.send('API is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
