import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { query } from '../db.js';

const router = express.Router();
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM loans ORDER BY trans_date DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM loans WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/', async (req, res) => {
  const { trans_date, category, description, amount } = req.body;
  try {
    const { rows } = await query(
      'INSERT INTO loans (trans_date, category, description, amount) VALUES ($1,$2,$3,$4) RETURNING *',
      [trans_date, category, description, amount]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  const { trans_date, category, description, amount } = req.body;
  try {
    const { rows } = await query(
      'UPDATE loans SET trans_date=$1, category=$2, description=$3, amount=$4 WHERE id=$5 RETURNING *',
      [trans_date, category, description, amount, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM loans WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: 'Not found' });
    res.status(204).send();
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
