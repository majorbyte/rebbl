'use strict';
const signUpService = require('../lib/signupService.js')
  , util = require('../lib/util.js')
  , express = require('express')
  , router = express.Router();

router.use('/api', require('./api/api'));
router.use('/maintenance', require('./maintenance/maintenance'));
router.use('/wcq', require('./wcq/wcq'));
router.use('/rebbl', require('./rebbl/rebbl'));
router.use('/account', require('./account/account'));
router.use('/signup', require('./signup/signup'));
router.use('/auth', require('./account/auth'));
router.use('/coach', require('./coach/coach'));

router.get('/', async function(req, res, next){
    if(req.isAuthenticated()){
        let coach = await signUpService.getSignUp(req.user.name);
        if(coach) {
            res.redirect(`/rebbl/${coach.league}`);
            return;
        }
    }
    res.redirect(`/wcq`);
});

module.exports = router;