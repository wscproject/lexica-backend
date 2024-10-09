import express from 'express';
import Auth from './auth.route';
import Contribution from './contribution.route';
import Lexeme from './lexeme.route';
import Entity from './entity.route';
import Language from './language.route';
import User from './user.route';
import Activity from './activity.route';

const router = express.Router();
router.use('/auth', Auth);
router.use('/contributions', Contribution);
router.use('/lexemes', Lexeme);
router.use('/entites', Entity);
router.use('/languages', Language);
router.use('/users', User);
router.use('/activities', Activity);


module.exports = router;
