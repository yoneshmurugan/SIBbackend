import express from 'express';
import { Coordinator, Membership, User } from '../../schemas.mjs';

const router = express.Router();

router.post('/createcoordinators', async (req, res) => {
    try {
        req.body.chapter_id = req.chapter._id;
        const { name, role, chapter_id } = req.body;
        const coordinator = new Coordinator({ name, role, chapter_id });
        await coordinator.save();
        res.status(201).json(coordinator);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/getcoordinators', async (req, res) => {
    try {
        const coordinators = await Coordinator.find({ chapter_id: req.chapter._id })
        res.json(coordinators);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/updatecoordinatorsbyrole', async (req, res) => {
    try {
        const { name, role } = req.body;
        const coordinator = await Coordinator.findOneAndUpdate(
            { chapter_id: req.chapter._id, role: role },
            { name },
        );
        if (!coordinator) return res.status(404).json({ error: 'Coordinator not found' });
        res.json(coordinator);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/deletecoordinators/:id', async (req, res) => {
    try {
        const coordinator = await Coordinator.findByIdAndDelete(req.params.id);
        if (!coordinator) return res.status(404).json({ error: 'Coordinator not found' });
        res.json({ message: 'Coordinator deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
