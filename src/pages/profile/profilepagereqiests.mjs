import express from 'express';

const router = express.Router();

router.get('/showprofile',
  async (req, res) => {
    let editable = false;
    if (req.user) editable = true;
    res.send({ editable })
  }
);

export default router