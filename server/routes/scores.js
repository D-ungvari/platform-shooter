import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /scores?limit=10
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const result = await pool.query(
            'SELECT id, name, score, created_at FROM scores ORDER BY score DESC LIMIT $1',
            [limit]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching scores:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /scores
router.post('/', async (req, res) => {
    try {
        let { name, score } = req.body;

        // Validate name
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Invalid input', details: 'Name is required' });
        }
        name = name.trim();
        if (name.length < 1 || name.length > 20) {
            return res.status(400).json({ error: 'Invalid input', details: 'Name must be 1-20 characters' });
        }
        if (!/^[a-zA-Z0-9 ]+$/.test(name)) {
            return res.status(400).json({ error: 'Invalid input', details: 'Name must be alphanumeric characters and spaces only' });
        }

        // Validate score
        if (!Number.isInteger(score) || score <= 0) {
            return res.status(400).json({ error: 'Invalid input', details: 'Score must be a positive integer' });
        }

        const insertResult = await pool.query(
            'INSERT INTO scores (name, score) VALUES ($1, $2) RETURNING id, name, score, created_at',
            [name, score]
        );
        const row = insertResult.rows[0];

        const rankResult = await pool.query(
            'SELECT COUNT(*) + 1 AS rank FROM scores WHERE score > $1',
            [score]
        );
        const rank = parseInt(rankResult.rows[0].rank, 10);

        res.status(201).json({ ...row, rank });
    } catch (err) {
        console.error('Error submitting score:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
