"use strict";

class AdminBB3Service{
  constructor(){
    this.url = process.env['bb3AdminUrl'];
  }

  async adminMatch(cookie, competitionId, matchId, homeScore,awayScore){
    if (cookie == null) cookie = await this.#login();

    await this.#adminCompetition(cookie, competitionId);
    await this.#adminMatch(cookie, matchId, homeScore,awayScore);

    return cookie;
  }

  async resetMatch(cookie, competitionId, matchId){
    if (cookie == null) cookie = await this.#login();

    await this.#adminCompetition(cookie, competitionId);
    await this.#resetMatch(cookie, matchId);

    return cookie;
  }
  async validateMatch(cookie, competitionId, matchId){
    if (cookie == null) cookie = await this.#login();

    await this.#adminCompetition(cookie, competitionId);
    await this.#validateMatch(cookie, matchId);

    return cookie;
  }

  async setCompetitionToAdmin(cookie, competitionId){
    if (cookie == null) cookie = await this.#login();

    await this.#adminCompetition(cookie, competitionId);

    return cookie;
  }

  async startCompetition(cookie){
    if (cookie == null) cookie = await this.#login();

    await this.#executeQuery(cookie, "begin_competition", "bb3_begin_competition_NOPARAM","");

    return cookie;

  }

  async setAutomaticMatchValidation(cookie, state){
    if (cookie == null) cookie = await this.#login();

    await this.#executeQuery(cookie, "set_automatic_match_validation", "bb3_set_automatic_match_validation_AutomaticMatchValidation", state ? 1 : 0);
    
    return cookie;
  }

  async setTeamToAdmin(cookie, competitionId, teamId){
    if (cookie == null) cookie = await this.#login();

    await this.#adminCompetition(cookie, competitionId);
    await this.#adminTeam(cookie, teamId);

    return cookie;
  }

  async assingSpp(cookie, players){
    if (cookie == null) cookie = await this.#login();

    for(const player of players){
      await this.#assignSpp(cookie, player.id, player.spp);
    }
    return cookie;
  }

  async clearMng(cookie, players){
    if (cookie == null) cookie = await this.#login();

    for(const player of players){
      await this.#setMngState(cookie, player.id, "false");
    }
    return cookie;
  }

  async applyMng(cookie, players){
    if (cookie == null) cookie = await this.#login();

    for(const player of players){
      await this.#setMngState(cookie, player.id, "true");
    }
    return cookie;
  }

  async awardCash(cookie, cash){
    if (cookie == null) cookie = await this.#login();

    await this.#assignCash(cookie, cash);
    return cookie;
  }

  async setApothecary(cookie, quantity){
    if (cookie == null) cookie = await this.#login();

    await this.#executeQuery(cookie, "set_apothicary", "bb3_set_apothicary_Apothicary", quantity)
  }

  async setCheerleaders(cookie, quantity){
    if (cookie == null) cookie = await this.#login();

    await this.#executeQuery(cookie, "set_cheerleaders", "bb3_set_cheerleaders_Cheerleaders", quantity)
  }

  async setAssistantCoaches(cookie, quantity){
    if (cookie == null) cookie = await this.#login();

    await this.#executeQuery(cookie, "set_coach_assistants", "bb3_set_coach_assistants_CoachAssistants", quantity)
  }

  async setRerolls(cookie, quantity){
    if (cookie == null) cookie = await this.#login();

    await this.#executeQuery(cookie, "set_rerolls", "bb3_set_rerolls_Rerolls", quantity)
  }

  async setDedicatedFans(cookie, quantity){
    if (cookie == null) cookie = await this.#login();

    await this.#executeQuery(cookie, "set_dedicated_fans", "bb3_set_dedicated_fans_DedicatedFans", quantity)
  }

  async setInjury(cookie, playerId, injury){
    if (cookie == null) cookie = await this.#login();

    await this.#executeQuery(cookie, "add_injury", "bb3_add_injury_Player", playerId, "bb3_add_injury_Injury", injury)

  }

  async removeInjury(cookie, playerId, injury){
    if (cookie == null) cookie = await this.#login();

    await this.#executeQuery(cookie, "remove_injury", "bb3_remove_injury_Player", playerId, "bb3_remove_injury_Injury", injury)

  }

  async replaceTeam(cookie, replacedTeamId, replacingTeamId){
    if (cookie == null) cookie = await this.#login();

    await this.#executeQuery(cookie, "replace_team", "bb3_replace_team_ReplacedTeam", replacedTeamId, "bb3_replace_team_ReplacingTeam", replacingTeamId)
  }

  async #login() {
    const response = await fetch(this.url, {
      'headers': {
          'accept': '*/*',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      'body': `user_username=${process.env['bb3User']}&user_password=${encodeURIComponent(process.env['bb3Password'])}&game_env=bb3_live_pc&login=Log+in`,
      'method': 'POST',
    });

    return response.headers.getSetCookie();
  }

  async #adminLeague(cookie,leagueId){
    const data = new Map();
    data.set("query", "administrate_league");
    data.set("bb3_administrate_league_League", leagueId);

    await this.#adminCall(cookie, this.#getFormData(data));
  }

  async #adminCompetition(cookie,competitionId){
    const data = new Map();
    data.set("query", "administrate_competition");
    data.set("bb3_administrate_competition_Competition", competitionId);

    await this.#adminCall(cookie, this.#getFormData(data));
  }

  async #adminMatch(cookie, matchId, homeScore, awayScore){
    let data = new Map();
    data.set("query", "administrate_match");
    data.set("bb3_administrate_match_Match", matchId);

    await this.#adminCall(cookie, this.#getFormData(data));

    data = new Map();
    data.set("query", "set_match_result");
    data.set("bb3_set_match_result_HomeScore", homeScore);
    data.set("bb3_set_match_result_AwayScore", awayScore);

    await this.#adminCall(cookie, this.#getFormData(data));
  }

  async #adminTeam(cookie,teamId){
    const data = new Map();
    data.set("query", "administrate_team");
    data.set("bb3_administrate_team_Team", teamId);

    await this.#adminCall(cookie, this.#getFormData(data));
  }

  async #assignCash(cookie, cash){
    const data = new Map();
    data.set("query", "set_treasury");
    data.set("bb3_set_treasury_Amount", cash);

    await this.#adminCall(cookie, this.#getFormData(data));
  }

  async #assignSpp(cookie,playerId, spp){
    const data = new Map();
    data.set("query", "set_player_spp");
    data.set("bb3_set_player_spp_Players[]", playerId);
    data.set("bb3_set_player_spp_SPP", spp);

    await this.#adminCall(cookie, this.#getFormData(data));
  }

  async #executeQuery(cookie,query, ...values){
    const data = new Map();
    data.set("query", query);

    for(let x =0;x < values.length-1;x+=2)
      data.set(values[x], values[x+1]);

    await this.#adminCall(cookie, this.#getFormData(data));
  }


  async #setMngState(cookie, playerId, state){
    const data = new Map();
    data.set("query", "set_miss_next_game");
    data.set("bb3_set_miss_next_game_Player", playerId);
    data.set("bb3_set_miss_next_game_MissNextGame", state);

    await this.#adminCall(cookie, this.#getFormData(data));
  }

  async #resetMatch(cookie, matchId){
    let data = new Map();
    data.set("query", "administrate_match");
    data.set("bb3_administrate_match_Match", matchId);

    await this.#adminCall(cookie, this.#getFormData(data));

    data = new Map();
    data.set("query", "cancel_and_redo_match");

    await this.#adminCall(cookie, this.#getFormData(data));

  }

  async #validateMatch(cookie, matchId){
    let data = new Map();
    data.set("query", "administrate_match");
    data.set("bb3_administrate_match_Match", matchId);

    await this.#adminCall(cookie, this.#getFormData(data));

    data = new Map();
    data.set("query", "validate_match");
    data.set("bb3_validate_match_NOPARAM", "");

    await this.#adminCall(cookie, this.#getFormData(data));

  }

  async #adminCall(cookie, formData){
    const resp = await fetch(this.url, {
        method: "POST",
        headers:{
            cookie:cookie
        },
        body: formData,
    });

    //const data = await resp.text();
    //console.log(data.replace(/&#8203;/g,""));
  }

  #getFormData(data){
    const body = new FormData();
    body.set("game", "bb3");
    body.set("cat", "admin");
    body.set("t", Date.now());

    for(const [key,value] of data)
        body.set(key, value);
    return body
  }
}

module.exports = new AdminBB3Service();
