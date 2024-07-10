import express from 'express';
import Auth from './auth.route';
import Contribution from './contribution.route';
import Lexeme from './lexeme.route';
import Entity from './entity.route';

const router = express.Router();
router.use('/auth', Auth);
router.use('/contributions', Contribution);
router.use('/lexemes', Lexeme);
router.use('/entites', Entity);


module.exports = router;
