var TeamModel = function(){
    const self = this;

    self.alliance = ko.observable();
    self.players = ko.observableArray();
    self.rerolls = ko.observable(0);
    self.hasApo= ko.observable(false);
    self.name = ko.observable();

    self.leagues = ko.computed(() => [...new Set(self.players().map(p => p.league) )] );

    self.hasBigO = ko.computed(() => self.leagues().indexOf("BIG O") > -1);
    self.hasGman = ko.computed(() => self.leagues().indexOf("GMAN") > -1);
    self.hasRel = ko.computed(() => self.leagues().indexOf("REL") > -1);

    self.toggleApo = function(data,event){
        self.hasApo(!self.hasApo());
    }

    self.addReroll = function(){
        if(self.rerolls() < 8)
            self.rerolls(self.rerolls()+1);
    }

    self.removeReroll = function(){
        if(self.rerolls() > 0)
            self.rerolls(self.rerolls()-1);
    }

    self.tv = ko.computed(function(){
        let rrValue = self.rerolls() * (self.alliance() ? self.alliance().reroll : 0);
        let tv = rrValue + (self.hasApo() ? 50 : 0) ;
        return self.players().reduce(function(p,c){ return p + c.value }, tv) 
    }); 

    self.map = function(data){
        self.alliance(data.alliance);
        self.players(data.players);
        self.rerolls(data.rerolls);
        self.hasApo(data.hasApo);
        self.name(data.name);
    }
}

var Model = function(){
    const self = this;
    self.mixedTeam = ko.observable(new TeamModel());
    self.races = ko.observableArray([
        {id:13,name:"Amazon"}
        ,{id:24,name:"Bretonnian"}
        ,{id:8,name:"Chaos"}
        ,{id:21,name:"Chaos Dwarf"}
        ,{id:9,name:"Dark Elf"}
        ,{id:2,name:"Dwarf"}
        ,{id:14,name:"Elven Union"}
        ,{id:6,name:"Goblin"}
        ,{id:11,name:"Halfling"}
        ,{id:15,name:"High Elf"}
        ,{id:1,name:"Human"}
        ,{id:16,name:"Khemri"}
        ,{id:25,name:"Kislev"}
        ,{id:5,name:"Lizardman"}
        ,{id:17,name:"Necromantic"}
        ,{id:12,name:"Norse"}
        ,{id:18,name:"Nurgle"}
        ,{id:4,name:"Orc"}
        ,{id:19,name:"Ogre"}
        ,{id:3,name:"Skaven"}
        ,{id:10,name:"Undead"}
        ,{id:22,name:"Underworld Denizens"}
        ,{id:20,name:"Vampire"}
        ,{id:7,name:"Wood Elf"}
    ]);
    self.mixedTeams = ko.observableArray([
     {name:"Alliance of Goodness",reroll: 50,races:[24,1,2,11,7],apo:true }
    ,{name:"Chaotic Player Pact",reroll: 60, races:[8,3,9,22],apo:true}
    ,{name:"Afterlife United",reroll:70, races:[10,17,16,20],apo:false}
    ,{name:"Superior Being Ring",reroll: 60, races:[15,20,21,24],apo:true}
    ,{name:"Union of Small People",reroll: 60, races:[19,6,11],apo:true}
    ,{name:"Violence Together",reroll: 60, races:[4,6,5,19],apo:true}
    ,{name:"Elfic Grand Coalition",reroll: 50, races:[15,9,7,14],apo:true}
    ,{name:"Chaos Gods Selection",reroll:60, races:[8,18],apo:true}
    ,{name:"Far East Associaion",reroll:60,	races:[21,4,6,3,19],apo:true}
    ,{name:"Anti-Fur Society",reroll:60,races:[25,12,13,5],apo:true}
    ,{name:"Human League",reroll:50,races:[1,24,25,12,13],apo:true}
    ]);
    self.skills = [
        "StripBall"
        ,"IncreaseStrength"
        ,"IncreaseAgility"
        ,"IncreaseMovement"
        ,"IncreaseArmour"
        ,"Catch"
        ,"Dodge"
        ,"Sprint"
        ,"PassBlock"
        ,"FoulAppearance"
        ,"Leap"
        ,"ExtraArms"
        ,"MightyBlow"
        ,"Leader"
        ,"Horns"
        ,"TwoHeads"
        ,"StandFirm"
        ,"AlwaysHungry"
        ,"Regeneration"
        ,"TakeRoot"
        ,"Accurate"
        ,"BreakTackle"
        ,"SneakyGit"
        ,"Chainsaw"
        ,"Dauntless"
        ,"DirtyPlayer"
        ,"DivingCatch"
        ,"DumpOff"
        ,"Block"
        ,"BoneHead"
        ,"VeryLongLegs"
        ,"DisturbingPresence"
        ,"DivingTackle"
        ,"Fend"
        ,"Frenzy"
        ,"Grab"
        ,"Guard"
        ,"HailMaryPass"
        ,"Juggernaut"
        ,"JumpUp"
        ,"Loner"
        ,"NervesOfSteel"
        ,"NoHands"
        ,"Pass"
        ,"PilingOn"
        ,"PrehensileTail"
        ,"Pro"
        ,"ReallyStupid"
        ,"RightStuff"
        ,"SafeThrow"
        ,"SecretWeapon"
        ,"Shadowing"
        ,"SideStep"
        ,"Tackle"
        ,"StrongArm"
        ,"Stunty"
        ,"SureFeet"
        ,"SureHands"
        ,"ThickSkull"
        ,"ThrowTeamMate"
        ,"WildAnimal"
        ,"Wrestle"
        ,"Tentacles"
        ,"MultipleBlock"
        ,"Kick"
        ,"KickOffReturn"
        ,"BigHand"
        ,"Claw"
        ,"BallChain"
        ,"Stab"
        ,"HypnoticGaze"
        ,"Stakes"
        ,"Bombardier"
        ,"Decay"
        ,"NurglesRot"
        ,"Titchy"
        ,"BloodLust"
        ,"FanFavourite"
        ,"Animosity"       
    ].sort((a,b) => a > b ? 1 : -1);
    
    self.localTeams = ko.observableArray();
    self.selectedAlliance = ko.observable({name:"Alliance of Goodness",reroll: 50,races:[24,1,2,11,7],apo:true });
    self.teams = ko.observableArray();
    self.selectedRaces = ko.observableArray();
    self.selectedTeams = ko.observableArray();
    self.pageNumber = ko.observable(0);
    self.showTeams = ko.observable(false);
    self.showSkills = ko.observable(false);

    self.bigO = ko.observable(true);
    self.gman = ko.observable(true);
    self.rel = ko.observable(true);

    self.toggleBIGO = () => self.bigO(!self.bigO());
    self.toggleGMAN = () => self.gman(!self.gman());
    self.toggleREL = () => self.rel(!self.rel());


    self.isSaved = ko.computed(() => self.localTeams().findIndex(team => team.name === self.mixedTeam().name()) > -1 );

    //player filters
    self.minValue = ko.observable();
    self.maxValue = ko.observable();
    self.selectedSkills = ko.observableArray();

    ko.computed(function(){
        console.log("alliance change");
    //    self.mixedTeam(new TeamModel());
      //  self.mixedTeam().alliance(self.selectedAlliance());
    })

    self.filteredTeams = ko.computed(function() {
        if (!self.selectedAlliance()) return;

        let races = [];
        if(!self.selectedRaces() || self.selectedRaces().length === 0) {
            races = self.races().filter(function(race){ return self.selectedAlliance().races.indexOf(race.id) > -1 });
            races = races.map(race => race.id);
        } else {
            races = self.selectedRaces();
            if (!Array.isArray(races)){
                races = [races];
            }
        }
       
        return self.teams().filter(function(team){ 
        
            let league = self.bigO() && team.team.league === "BIG O" 
            ||self.gman() && team.team.league === "GMAN" 
            ||self.rel() && team.team.league === "REL" ;
            
            
            return league && races.indexOf(team.team.idraces) > -1 ;
        }).sort((a,b) => a.team.name > b.team.name ? 1 : -1);
    });
    self.filteredRaces = ko.computed(function() {
        if(!self.selectedAlliance()) {
            return; 
        } else {
            let alliance = self.selectedAlliance();
            return self.races().filter(function(race){ return alliance.races.indexOf(race.id) > -1 });
        }
    });

    self.allPlayerIds = ko.computed(function(){
        let players =[];
        self.teams().map(function(team){
            if (!team.roster){
                console.log(team.name);
                return;
            } 
            players = team.roster.reduce(function(p,c){
                p.push(c.id);
                return p;
            },players);
        },players);
        return players;
    });

    self.filteredPlayers = ko.computed(function(){
        self.pageNumber(0);
        let getPlayers = function(teams){
            let players =[];
            teams.map(function(team){
               if (!team.roster){
                   console.log(team.name);
                   return;
               } 
               players = team.roster.reduce(function(p,c){
                    let add = true;
                    if(self.minValue() > 0 && self.minValue() > c.value){
                        add = false;
                    }
                    if(self.maxValue() > 0 && self.maxValue() < c.value){
                        add = false;
                    }

                    let addBySkill = false;
                    if (self.selectedSkills()){

                        addBySkill = self.selectedSkills().reduce((ps,cs)=> ps =ps && c.skills.indexOf(cs) > -1 , true );
                        addBySkill = c.skills.length > 0  && addBySkill;

                    } else {
                        addBySkill = true;
                    }

                    if (add && (self.selectedSkills().length > 0 ? addBySkill : true) ){
                        c.teamId = team.team.id;
                        c.league = team.team.league;
                        p.push(c);
                    }
                    return p;
                },players);
            },players);
            return players;
        }

        let data = [];
        if (self.selectedTeams() && self.selectedTeams().length > 0)
            data =  getPlayers(self.selectedTeams());
        else if (self.filteredTeams() && self.filteredTeams().length > 0 )
            data = getPlayers(self.filteredTeams());

        $("#playerList").show(); 
        return data;
    }).extend({ deferred: true });


    self.all = ko.observableArray([]);

    self.nbPerPage = 20;
    self.totalPages = ko.computed(function() {
        var div = Math.floor(self.filteredPlayers().length / self.nbPerPage);
        div += self.filteredPlayers().length % self.nbPerPage > 0 ? 1 : 0;
        return div - 1;
    });

    self.pagedPlayers = ko.computed(function() {
        var first = self.pageNumber() * self.nbPerPage;
        return self.filteredPlayers().slice(first, first + self.nbPerPage);
    });

    self.hasPrevious = ko.computed(function() {
        return self.pageNumber() !== 0;
    });

    self.hasNext = ko.computed(function() {
        return self.pageNumber() !== self.totalPages();
    });

    self.next = function() {
        if(self.pageNumber() < self.totalPages()) {
            self.pageNumber(self.pageNumber() + 1);
        }
    }

    self.previous = function() {
        if(self.pageNumber() != 0) {
            self.pageNumber(self.pageNumber() - 1);
        }
    }



    self.setAlliance = function(data,event){
        self.selectedAlliance(data);
        self.selectedRaces([]);
        self.selectedTeams([]);
    }

    self.toggleRace = function(data,event){
        let index = self.selectedRaces.indexOf(data.id);
        if( index > -1){
            self.selectedRaces.splice(index,1);
        } else {
            self.selectedRaces.push(data.id);
        }
    }

    self.toggleTeam = function(data,event){
        let index = self.selectedTeams.indexOf(data);
        if( index > -1){
            self.selectedTeams.splice(index,1);
        } else {
            self.selectedTeams.push(data);
        }
    }

    self.toggleSkill = function(data,event){
        let index = self.selectedSkills.indexOf(data);
        if( index > -1){
            self.selectedSkills.splice(index,1);
        } else {
            self.selectedSkills.push(data);
        }
    }

    self.addPlayer = function(data,event){
        if (self.mixedTeam().players.indexOf(data) === -1)
            self.mixedTeam().players.push(data);
    }
    self.removePlayer = function(data,event){
        let i = self.mixedTeam().players.indexOf(data);
        self.mixedTeam().players.splice(i,1);
    }

    self.togglePlayerList = function(){
        $("#playerList").toggle();       
        $("#spinner").toggle();       
    }

    self.setSelectedTeam = function(data,event){
        let team = new TeamModel();

        for(let i = data.players.length-1;i> -1 ;i-- ){
            let player =self.allPlayerIds().find(p => p === data.players[i].id);
            if(!player){
                data.players.splice(i,1);
            }
        }
        team.map(data);


        self.mixedTeam(team);
    }

    self.saveTeam = function(){
        let index = self.localTeams().findIndex(team => team.name === self.mixedTeam().name());

        if(index > -1){
            self.localTeams()[index] = ko.toJS(self.mixedTeam());
        } else {
            self.localTeams.push(ko.toJS(self.mixedTeam()));
        }

       window.localStorage.setItem("teams", ko.toJSON(self.localTeams())); 
    }

    self.removeTeam = function(){
        let index = self.localTeams().findIndex(team => team.name === self.mixedTeam().name());

        if(index > -1){
            self.localTeams.splice(index,1);
        }

       window.localStorage.setItem("teams", ko.toJSON(self.localTeams())); 

       self.mixedTeam(new TeamModel());

    }

}

ko.bindingHandlers.toggle = {
    init: function (element, valueAccessor) {
        var value = valueAccessor();

        ko.utils.registerEventHandler(element, "click", function () {
            value(!value());
        });
    }
};

$(document).ready(function(){
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://cdn2.rebbl.net/scripts/rabbl/data/teams.v3.json",true)
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.responseType = 'json';

    xhr.onload  = function() {//Call a function when the state changes.
        let model = new Model();
        window.model = model;
        model.teams(xhr.response);

        let data = window.localStorage.getItem("teams");

        if(data){
            data = JSON.parse(data);
        } else {
            data = [];
        }

        model.localTeams(data);

        ko.applyBindings(model)
    }

    xhr.send();
});