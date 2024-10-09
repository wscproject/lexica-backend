import express from 'express';
import * as controller from '../../../controllers/user/v1/ActivityController';
// import * as middleware from '../../../middlewares/user/v1/lexemeMiddleware';
import { validateToken, validateUser } from '../../../middlewares/user/v1/commonMiddleware';

const router = express.Router();

router.get('/', validateToken, validateUser, controller.getActivities);

export default router;
