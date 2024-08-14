import express from 'express';
import * as controller from '../../../controllers/user/v1/ContributionController';
import * as middleware from '../../../middlewares/user/v1/contributionMiddleware'
import { validateToken, validateUser } from '../../../middlewares/user/v1/commonMiddleware';

const router = express.Router();

router.post('/start', validateToken, validateUser, controller.startContribution);
router.put('/detail/:senseId', validateToken, validateUser, middleware.validateUpdateContributionDetail, controller.updateContributionDetail);
router.post('/end', validateToken, validateUser, controller.endContribution);

export default router;
