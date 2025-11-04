// src/routes/events.ts
import { Router, Request, Response } from 'express';
import { PrismaClient, Event } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all events
router.get('/', async (req: Request, res: Response) => {
  try {
    const events: Event[] = await prisma.event.findMany();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get event by ID
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create new event
router.post('/', async (req: Request, res: Response) => {
  const { name, date, location } = req.body;
  try {
    const newEvent = await prisma.event.create({
      data: {
        name,
        date: new Date(date),
        location,
      },
    });
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

export default router;
