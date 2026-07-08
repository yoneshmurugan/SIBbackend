import OneToOneRouter from './OneToOneRoute.mjs';
import RefferalRouter from './referralsRoute.mjs';
import express from 'express'
import VisitorRouter from './VisitorsRoute.mjs';
import TyftbRouter from './tyftbRoute.mjs';

const slipsRouter = express.Router();

slipsRouter.use('/one2one',OneToOneRouter)
slipsRouter.use('/referral',RefferalRouter)
slipsRouter.use('/visitor', VisitorRouter)
slipsRouter.use('/tyftb', TyftbRouter)

export default slipsRouter ;