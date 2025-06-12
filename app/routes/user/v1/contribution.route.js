import express from 'express';
import * as controller from '../../../controllers/user/v1/ContributionController';
import * as middleware from '../../../middlewares/user/v1/contributionMiddleware'
import { validateToken, validateUser } from '../../../middlewares/user/v1/commonMiddleware';

const router = express.Router();

router.post('/start', validateToken, validateUser, middleware.validateStartContribution, controller.startContribution);
router.post('/end', validateToken, validateUser, controller.endContribution);
router.get('/:contributionId/connect/:id', validateToken, validateUser, middleware.validateGetContributionConnectDetail, controller.getContributionConnectDetail);
router.get('/:contributionId/script/:id', validateToken, validateUser, middleware.validateGetContributionScriptDetail, controller.getContributionScriptDetail);
router.get('/:contributionId/hyphenation/:id', validateToken, validateUser, middleware.validateGetContributionHyphenationDetail, controller.getContributionHyphenationDetail);
router.put('/:contributionId/connect/:id', validateToken, validateUser, middleware.validateUpdateContributionConnectDetail, controller.updateContributionConnectDetail);
router.put('/:contributionId/script/:id', validateToken, validateUser, middleware.validateUpdateContributionScriptDetail, controller.updateContributionScriptDetail);
router.put('/:contributionId/hyphenation/:id', validateToken, validateUser, middleware.validateUpdateContributionHyphenationDetail, controller.updateContributionHyphenationDetail);

export default router;
