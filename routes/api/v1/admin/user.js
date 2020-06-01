'use strict';

const express = require('express')
  , accountService = require("../../../../lib/accountService.js")
  , util = require('../../../../lib/util.js')
  , router = express.Router();



  router.get('/', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      accountService.searchAccounts({}).then(function(data){
        data.map(x => {
            delete x._id;
            delete x.teamname;
            delete x.donations;
            delete x.showAmount;
            delete x.showDonation;
            delete x.showDonationValue;
            delete x.useDark;
            delete x.twitch;
            delete x.steam;
            delete x.strikes;
            delete x.warnings;
            delete x.bans;
        });  
        res.status(200).json(data);
      });
    } catch(err){
      console.log(err);
    }
  });
  

router.get('/:user', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let user = await accountService.getAccount(req.params.user);

    res.status(200).json(user);

  } catch(err){
    res.status(500).json(err);
  }
});


router.post('/update', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let account = { reddit: req.body.reddit
      , coach: req.body.coach
      , discord:  req.body.discord
      , steam: req.body.steam
      , timezone: req.body.timezone
      , twitch: req.body.twitch
      , team: req.body.team
      , race: req.body.race
    };

    account = await accountService.updateAccount(account);

    res.render('account/account', { user: account });
  } catch(err){
    console.log(err);
  }
});


router.post('/changeRedditAccount', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    await accountService.changeRedditAccount(req.body);

    res.status(200).send();
  } catch(err){
    console.log(err);
  }
});


router.post('/addStrike', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let strike = { 
      reason: req.body.strike.reason
      , start: req.body.strike.start
      , end: req.body.strike.end
      , active: req.body.strike.active
      , awardedBy: res.locals.user.reddit
    };

    let strikes = await accountService.addStrike(req.body.reddit, strike);

    res.status(200).json(strikes);
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/toggleStrike', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let strike = { 
      id: Number(req.body.strike.id)
      , reason: req.body.strike.reason
      , start: req.body.strike.start
      , end: req.body.strike.end
      , active: req.body.strike.active
    };

    await accountService.setStrike(req.body.reddit, Number(req.body.id), strike);

    res.status(200).json();
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/updateStrike', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let strike = { 
      id: Number(req.body.strike.id)
      , reason: req.body.strike.reason
      , start: req.body.strike.start
      , end: req.body.strike.end
      , active: req.body.strike.active
    };
    await accountService.updateStrike(req.body.reddit, strike);

    res.status(200).json();
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/addWarning', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let warning = { 
      reason: req.body.warning.reason
      , start: req.body.warning.start
      , end: req.body.warning.end
      , active: req.body.warning.active
      , awardedBy: res.locals.user.reddit
    };

    let warnings = await accountService.addWarning(req.body.reddit, warning);

    res.status(200).json(warnings);
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/updateWarning', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let warning = { 
      id: Number(req.body.warning.id)
      , reason: req.body.warning.reason
      , start: req.body.warning.start
      , end: req.body.warning.end
      , active: req.body.warning.active
    };
    await accountService.updateWarning(req.body.reddit, warning);

    res.status(200).send();
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/toggleAdmin', util.ensureAuthenticated, util.hasRole("superadmin"), async function(req, res){
  try{
    let role = { 
      role: req.body.role
      , action: req.body.action
    };
    await accountService.toggleRole(req.body.reddit, role);

    res.status(200).send();
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/toggleRole', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let role = { 
      role: req.body.role
      , action: req.body.action
    };
    await accountService.toggleRole(req.body.reddit, role);

    res.status(200).send();
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/addDonation', util.ensureAuthenticated, util.hasRole("superadmin"), async function(req, res){
  try{
    let donation = { 
      date: req.body.donation.date
      , currency: req.body.donation.currency
      , value: req.body.donation.value
    };
    await accountService.addDonation(req.body.reddit, donation);

    res.status(200).send();
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/addTrophy', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let trophy = { 
      date: req.body.trophy.date
      , filename: req.body.trophy.filename
      , name: req.body.trophy.name
      , title: req.body.trophy.title
    };
    await accountService.addTrophy(req.body.reddit, trophy);

    res.status(200).send();
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/deleteTrophy', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let trophy = { 
      date: req.body.trophy.date
      , filename: req.body.trophy.filename
      , name: req.body.trophy.name
      , title: req.body.trophy.title
    };
    await accountService.deleteTrophy(req.body.reddit, trophy);

    res.status(200).send();
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/addBan', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let ban = { 
      reason: req.body.ban.reason
      , start: req.body.ban.start
      , end: req.body.ban.end
      , active: req.body.ban.active
      , awardedBy: res.locals.user.reddit
    };

    let bans = await accountService.addBan(req.body.reddit, ban);

    res.status(200).json(bans);
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/toggleBan', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let ban = { 
      id: Number(req.body.ban.id)
      , reason: req.body.ban.reason
      , start: req.body.ban.start
      , end: req.body.ban.end
      , active: req.body.ban.active
    };

    await accountService.setBan(req.body.reddit,ban.id, ban);

    res.status(200).send();
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/updateBan', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let ban = { 
      id: Number(req.body.ban.id)
      , reason: req.body.ban.reason
      , start: req.body.ban.start
      , end: req.body.ban.end
      , active: req.body.ban.active
    };
    await accountService.updateBan(req.body.reddit, ban);

    res.status(200).send();
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/addNote', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let note = { 
      text: req.body.note.text
      , date: new Date(Date.now())
      , writtenBy: res.locals.user.reddit
    };

    let notes = await accountService.addNote(req.body.reddit, note);

    res.status(200).json(notes);
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});

router.post('/updateNote', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    let note = { 
      id: Number(req.body.note.id)
      , text: req.body.note.text
      , modifiedOn: new Date(Date.now())
      , modifiedBy: res.locals.user.reddit
    };
    await accountService.updateNote(req.body.reddit, note);

    res.status(200).send();
  } catch(err){
    res.status(500).json(err);
    console.log(err);
  }
});


module.exports = router;