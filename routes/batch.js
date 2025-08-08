const express = require('express');
const router = express.Router();
const { addBatch, deleteBatch, getAllBatches, getAllBatchesWithStudentCount } = require('../controllers/batchController');


router.post('/add', addBatch);
router.delete('/:id', deleteBatch);
router.get('/', getAllBatches);
router.get('/all', getAllBatchesWithStudentCount);


module.exports = router;
