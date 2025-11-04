// src/routes/bookings.ts
import { Router, Request, Response } from 'express';
import { PrismaClient, Booking } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all bookings
router.get('/', async (req: Request, res: Response) => {
  try {
    const bookings: Booking[] = await prisma.booking.findMany();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get booking by ID
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create new booking
router.post('/', async (req: Request, res: Response) => {
  const { userId, eventId, status } = req.body;
  try {
    const newBooking = await prisma.booking.create({
      data: {
        userId,
        eventId,
        status,
      },
    });
    res.status(201).json(newBooking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

export default router;
