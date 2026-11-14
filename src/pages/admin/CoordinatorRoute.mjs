import express from 'express';
import { Coordinator, Membership, User } from '../../schemas.mjs';

const router = express.Router();

export const DEFAULT_CORE_ROLES = ['President', 'VP', 'Secretary', 'Treasurer'];

router.post('/createcoordinators', async (req, res) => {
    try {
        req.body.chapter_id = req.chapter._id;
        const { name, role, chapter_id } = req.body;
        const coordinator = new Coordinator({ name: (name || 'Not Assigned').trim(), role, chapter_id });
        await coordinator.save();
        res.status(201).json(coordinator);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/getcoordinators', async (req, res) => {
    try {
        if (!req.chapter || !req.chapter._id) {
            return res.status(400).json({ error: 'Chapter context is required' });
        }

        let coordinators = await Coordinator.find({ chapter_id: req.chapter._id });

        // If no coordinators exist for this chapter yet, auto-initialize the 4 standard core team roles
        if (coordinators.length === 0) {
            const initialDocs = DEFAULT_CORE_ROLES.map(role => ({
                name: 'Not Assigned',
                role,
                chapter_id: req.chapter._id
            }));
            coordinators = await Coordinator.insertMany(initialDocs);
        } else {
            // Check if any standard role is missing and insert it
            const existingRoles = new Set(coordinators.map(c => c.role));
            const missingRoles = DEFAULT_CORE_ROLES.filter(r => !existingRoles.has(r));
            if (missingRoles.length > 0) {
                const newDocs = missingRoles.map(role => ({
                    name: 'Not Assigned',
                    role,
                    chapter_id: req.chapter._id
                }));
                const inserted = await Coordinator.insertMany(newDocs);
                coordinators = [...coordinators, ...inserted];
            }
        }

        // Return sorted consistently by standard role order
        const roleOrderMap = { 'President': 1, 'VP': 2, 'Secretary': 3, 'Treasurer': 4 };
        coordinators.sort((a, b) => (roleOrderMap[a.role] || 99) - (roleOrderMap[b.role] || 99));

        res.json(coordinators);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/updatecoordinatorsbyrole', async (req, res) => {
    try {
        if (!req.chapter || !req.chapter._id) {
            return res.status(400).json({ error: 'Chapter context is required' });
        }
        const { name, role } = req.body;
        if (!role) {
            return res.status(400).json({ error: 'Role is required' });
        }

        const coordinator = await Coordinator.findOneAndUpdate(
            { chapter_id: req.chapter._id, role: role },
            { 
                name: (name && name.trim()) ? name.trim() : 'Not Assigned', 
                chapter_id: req.chapter._id, 
                role: role 
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
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
