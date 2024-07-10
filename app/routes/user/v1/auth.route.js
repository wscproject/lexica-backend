import express from 'express';
import * as controller from '../../../controllers/user/v1/AuthController';
import * as middleware from '../../../middlewares/user/v1/authMiddleware'
import { validateToken, validateUser } from '../../../middlewares/user/v1/commonMiddleware';

const router = express.Router();

router.get('/profile', validateToken, validateUser, controller.getUserProfile);
router.post('/access-token', middleware.validateGetAccessToken, controller.accessToken);
router.post('/refresh-token', middleware.validateRefreshAccessToken, controller.refreshToken);

export default router;
