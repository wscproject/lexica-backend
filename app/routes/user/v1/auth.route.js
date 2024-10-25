import express from 'express';
import * as controller from '../../../controllers/user/v1/AuthController';
import * as middleware from '../../../middlewares/user/v1/authMiddleware'
import { validateToken, validateUser } from '../../../middlewares/user/v1/commonMiddleware';

const router = express.Router();

router.post('/login', middleware.validateLogin, controller.login);

export default router;
