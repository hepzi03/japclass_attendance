const Batch = require('../models/Batch');
const Student = require('../models/Student');

// Add a new batch
const addBatch = async (req, res) => {
  try {
    const { name, level } = req.body;

    const existing = await Batch.findOne({ name, level });
    if (existing) {
      return res.status(400).json({ error: 'Batch already exists' });
    }

    const batch = new Batch({ name, level });
    await batch.save();

    res.status(201).json({ message: 'Batch created successfully', batch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create batch' });
  }
};

// Delete a batch by ID
const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Batch.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json({ message: 'Batch deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
};

// Get all batches (simple version)
const getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find().sort({ name: 1, level: 1 });
    res.status(200).json({ batches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
};

// Get all batches with student count
const getAllBatchesWithStudentCount = async (req, res) => {
  try {
    const batches = await Batch.find().sort({ name: 1 });

    const enrichedBatches = await Promise.all(
      batches.map(async (batch) => {
        // Try different ways to match students based on the actual data format
        const studentCount1 = await Student.countDocuments({
          batchName: `${batch.name} ${batch.level}`
        });
        
        const studentCount2 = await Student.countDocuments({
          batchName: batch.name,
          level: batch.level
        });

        const studentCount = studentCount1 + studentCount2;

        return {
          ...batch.toObject(),
          studentCount,
        };
      })
    );

    res.status(200).json(enrichedBatches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
};

module.exports = {
  addBatch,
  deleteBatch,
  getAllBatches,
  getAllBatchesWithStudentCount,
};
