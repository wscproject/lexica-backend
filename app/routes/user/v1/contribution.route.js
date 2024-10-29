import express from 'express';
import * as controller from '../../../controllers/user/v1/ContributionController';
import * as middleware from '../../../middlewares/user/v1/contributionMiddleware'
import { validateToken, validateUser } from '../../../middlewares/user/v1/commonMiddleware';

const router = express.Router();

router.post('/end', validateToken, validateUser, controller.endContribution);
router.post('/connect/start', validateToken, validateUser, middleware.validateStartContributionConnect, controller.startContributionConnect);
router.put('/connect/:contributionDetailId', validateToken, validateUser, middleware.validateUpdateContributionConnectDetail, controller.updateContributionConnectDetail);
router.post('/script/start', validateToken, validateUser, middleware.validateStartContributionScript, controller.startContributionScript);
router.put('/script/:contributionDetailId', validateToken, validateUser, middleware.validateUpdateContributionScriptDetail, controller.updateContributionScriptDetail);

export default router;
