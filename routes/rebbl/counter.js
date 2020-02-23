'use strict';
const    
  express = require('express')
  , router = express.Router();

router.get('/', async function(req, res){
  try{
    res.render('rebbl/counter',null );
  } catch(err){
    console.log(err);
  }
});



module.exports = router;