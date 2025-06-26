import express from 'express';
import * as controller from '../../../controllers/user/v1/EntityController';
import * as middleware from '../../../middlewares/user/v1/entityMiddleware';
import { validateToken, validateUser } from '../../../middlewares/user/v1/commonMiddleware';

const router = express.Router();

router.get('/', validateToken, validateUser, controller.getEntities);
router.get('/recommendations', controller.getRecommendations);
router.get('/:entityId', validateToken, validateUser, middleware.validateGetEntityDetail, controller.getEntity);

export default router;
