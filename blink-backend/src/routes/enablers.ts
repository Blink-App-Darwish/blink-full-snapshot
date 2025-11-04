// src/routes/enablers.ts
import { Router, Request, Response } from 'express';
import { PrismaClient, Enabler } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all enablers
router.get('/', async (req: Request, res: Response) => {
  try {
    const enablers: Enabler[] = await prisma.enabler.findMany();
    res.json(enablers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enablers' });
  }
});

// Get enabler by ID
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const enabler = await prisma.enabler.findUnique({ where: { id } });
    if (!enabler) {
      return res.status(404).json({ error: 'Enabler not found' });
    }
    res.json(enabler);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enabler' });
  }
});

// Create new enabler
router.post('/', async (req: Request, res: Response) => {
  const { name, type } = req.body;
  try {
    const newEnabler = await prisma.enabler.create({
      data: {
        name,
        type,
      },
    });
    res.status(201).json(newEnabler);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create enabler' });
  }
});

export default router;
