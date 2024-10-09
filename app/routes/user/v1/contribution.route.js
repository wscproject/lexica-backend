import express from 'express';
import * as controller from '../../../controllers/user/v1/ContributionController';
import * as middleware from '../../../middlewares/user/v1/contributionMiddleware'
import { validateToken, validateUser } from '../../../middlewares/user/v1/commonMiddleware';

const router = express.Router();

router.post('/connect/start', validateToken, validateUser, controller.startContributionConnect);
router.put('/connect/:senseId', validateToken, validateUser, middleware.validateUpdateContributionDetail, controller.updateContributionConnectDetail);
router.post('/end', validateToken, validateUser, controller.endContribution);

export default router;
