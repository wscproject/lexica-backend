import express from 'express';
import Auth from './auth.route';
import Contribution from './contribution.route';
import Entity from './entity.route';
import Language from './language.route';
import User from './user.route';
import Activity from './activity.route';
import Wikidata from './wikidata.route';

const router = express.Router();
router.use('/auth', Auth);
router.use('/contributions', Contribution);
router.use('/entities', Entity);
router.use('/languages', Language);
router.use('/users', User);
router.use('/activities', Activity);
router.use('/wikidata', Wikidata);


module.exports = router;
