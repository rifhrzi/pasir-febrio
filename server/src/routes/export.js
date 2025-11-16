import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { exportData } from '../services/exporter.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/export/:type?format=xlsx|pdf
router.get('/:type?', async (req, res) => {
  const type = req.params.type || 'all';
  const format = req.query.format || 'xlsx';
  try {
    const buffer = await exportData({
      type,
      format,
      templatePath: process.env.EXPORT_TEMPLATE_PATH
    });
    const filename = `${type}_${Date.now()}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if (format === 'xlsx') res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    else res.setHeader('Content-Type', 'application/pdf');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Export failed' });
  }
});

export default router;
