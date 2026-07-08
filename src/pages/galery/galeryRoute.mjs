import express from 'express';
import {Gallery} from '../../schemas.mjs';

const router = express.Router();
router.get('/all', async (req, res) => {
    try {
        const galleries = await Gallery.find();
        res.json(galleries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Insert (Create) gallery
router.post('/upload', async (req, res) => {
    try {
        const gallery = new Gallery(req.body);
        await gallery.save();
        res.status(201).json(gallery);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete gallery by ID
router.delete('/delete/:id', async (req, res) => {
    try {
        const result = await Gallery.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Gallery not found' });
        }
        res.json({ message: 'Gallery deleted successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/updatecoverimage/:id', async (req, res) => {
    try {
        const result = await Gallery.findByIdAndUpdate(
            req.params.id,
            { $set: { coverImg: req.body.coverImg } },
            { new: true }
        );
        if (!result) {
            return res.status(404).json({ error: 'Gallery not found' });
        }
        res.json({ message: 'Cover image Updated successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Add photos to gallery by ID
 */
router.post('/add-photos/:id', async (req, res) => {
    try {
        const { photos } = req.body;
        if (!Array.isArray(photos) || photos.length === 0) {
            return res.status(400).json({ error: 'Photos array is required' });
        }

        const gallery = await Gallery.findById(req.params.id);
        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        if (!gallery.coverImg && photos[0]) {
            gallery.coverImg = photos[0];
        }

        gallery.photos.push(...photos);

        await gallery.save();
        res.json(gallery);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Delete a photo from gallery by ID
 */
router.delete('/delete-photo/:id', async (req, res) => {
    try {
        const { photo } = req.body;
        if (!photo) {
            return res.status(400).json({ error: 'Photo is required' });
        }
        const gallery = await Gallery.findByIdAndUpdate(
            req.params.id,
            { $pull: { photos: photo } },
            { new: true }
        );
        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }
        res.json(gallery);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const gallery = await Gallery.findByIdAndDelete(req.params.id);
        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' });
        }
        res.json({ message: 'Gallery deleted successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;