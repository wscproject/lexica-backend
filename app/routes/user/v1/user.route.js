import express from 'express';
import * as controller from '../../../controllers/user/v1/UserController';
import * as middleware from '../../../middlewares/user/v1/userMiddleware';
import { validateToken, validateUser } from '../../../middlewares/user/v1/commonMiddleware';

const router = express.Router();

router.get('/profile', validateToken, validateUser, controller.getUserProfile);
router.put('/preference', validateToken, validateUser, middleware.validateUpdateUserPreference, controller.updateUserPreference);

export default router;