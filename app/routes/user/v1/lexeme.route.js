import express from 'express';
import * as controller from '../../../controllers/user/v1/LexemeController';
import * as middleware from '../../../middlewares/user/v1/lexemeMiddleware';
import { validateToken, validateUser } from '../../../middlewares/user/v1/commonMiddleware';

const router = express.Router();

router.get('/sense/:senseId', validateToken, validateUser, middleware.validateGetLexemeSenseDetail, controller.getLexemeSenseDetail);

export default router;
