import express from 'express';
import { Region } from '../../../schemas.mjs';
import { regionValidators } from '../../../validators.mjs';
import { handleValidationErrors  } from '../../../middlewares.mjs';

const router = express.Router();

router.post(
  '/createregion',
  regionValidators.create,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { region_name, region_code, country, created_at } = req.body;
      const region = new Region({
        region_name,
        region_code,
        country,
        created_at: created_at ? new Date(created_at) : new Date(),
      });
      await region.save();
      res.status(201).json(region);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get('/getallregions', async (req, res) => {
  try {
    const regions = await Region.find().sort({ created_at: -1 });
    res.status(200).json(regions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get(
  '/getregionbyid/:id',
  regionValidators.idParam,
  handleValidationErrors,
  async (req, res) => {
    try {
      const region = await Region.findById(req.params.id);
      if (!region) {
        return res.status(404).json({ error: 'Region not found' });
      }
      res.json(region);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put(
  '/updateregionbyid/:id',
  regionValidators.update,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { region_name, region_code, country, created_at } = req.body;
      const updateData = {};
      if (region_name !== undefined) updateData.region_name = region_name;
      if (region_code !== undefined) updateData.region_code = region_code;
      if (country !== undefined) updateData.country = country;
      if (created_at !== undefined)
        updateData.created_at = new Date(created_at);

      const region = await Region.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      });
      if (!region) {
        return res.status(404).json({ error: 'Region not found' });
      }
      res.json(region);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete(
  '/deleteregionbyid/:id',
  regionValidators.idParam,
  handleValidationErrors,
  async (req, res) => {
    try {
      const region = await Region.findByIdAndDelete(req.params.id);
      if (!region) {
        return res.status(404).json({ error: 'Region not found' });
      }
      res.json({ message: 'Region deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
