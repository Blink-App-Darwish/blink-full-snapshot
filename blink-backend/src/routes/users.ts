// src/routes/users.ts
import { Router, Request, Response } from 'express';
import { PrismaClient, User } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all users
router.get('/', async (req: Request, res: Response) => {
  try {
    const users: User[] = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
router.post('/', async (req: Request, res: Response) => {
  const { name, email, user_type } = req.body;
  try {
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        user_type, // Make sure your Prisma schema has `user_type` required
      },
    });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Export router
export default router;
