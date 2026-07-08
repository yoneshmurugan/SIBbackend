import chapterMembershipRouter from './chapterMembershipRoute.mjs'
import chapterMainRouter from './chapterRoute.mjs'
import chapterStatisticRouter from './chapterStatisticRoute.mjs';
import express from 'express'

const ChapterRouter = express.Router();

ChapterRouter.use('/membership',chapterMembershipRouter)
ChapterRouter.use('/main', chapterMainRouter)
ChapterRouter.use('/statistics' , chapterStatisticRouter)

export default ChapterRouter ;