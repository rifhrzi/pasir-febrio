import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { query } from '../db.js';

const router = express.Router();
router.use(verifyToken);

// GET - All users can view
router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM expenses ORDER BY trans_date DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM expenses WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// POST - Admin only (with proof_image support)
router.post('/', requireAdmin, async (req, res) => {
  const { trans_date, category, description, amount, proof_image } = req.body;
  try {
    const { rows } = await query(
      'INSERT INTO expenses (trans_date, category, description, amount, proof_image) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [trans_date, category, description, amount, proof_image || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { 
    console.error('Error creating expense:', err);
    res.status(500).json({ message: 'Server error' }); 
  }
});

// POST /api/expenses/bulk - Bulk import (Admin only)
router.post('/bulk', requireAdmin, async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Items array is required' });
  }

  try {
    const results = [];
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const { trans_date, category, description, amount, proof_image } = items[i];
      try {
        const { rows } = await query(
          'INSERT INTO expenses (trans_date, category, description, amount, proof_image) VALUES ($1,$2,$3,$4,$5) RETURNING *',
          [trans_date, category || 'Lainnya', description || '', Number(amount) || 0, proof_image || null]
        );
        results.push(rows[0]);
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }

    res.status(201).json({ 
      success: true, 
      imported: results.length, 
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT - Admin only (with proof_image support)
router.put('/:id', requireAdmin, async (req, res) => {
  const { trans_date, category, description, amount, proof_image } = req.body;
  try {
    const { rows } = await query(
      'UPDATE expenses SET trans_date=$1, category=$2, description=$3, amount=$4, proof_image=$5 WHERE id=$6 RETURNING *',
      [trans_date, category, description, amount, proof_image || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// DELETE - Admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM expenses WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: 'Not found' });
    res.status(204).send();
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
