import express from 'express';
import * as controller from '../../../controllers/user/v1/LanguageController';
import * as middleware from '../../../middlewares/user/v1/languageMiddleware';
import { validateBasicAuth } from '../../../middlewares/user/v1/commonMiddleware';

const router = express.Router();

router.get('/', controller.getLanguages);
router.post('/', validateBasicAuth, middleware.validateCreateLanguage, controller.createLanguage);

export default router;
