'use strict';
const 
  express = require('express')
  , router = express.Router({mergeParams: true});

router.get('/', async function(req, res){
    res.render("rebbl/upcoming/index");
});

module.exports = router;