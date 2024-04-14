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

  async setTeamToAdmin(cookie, competitionId, teamId){
    if (cookie == null) cookie = await this.#login();

    await this.#adminCompetition(cookie, competitionId);
    await this.#adminTeam(cookie, teamId);

    return cookie;
  }

  async assingSpp(cookie, players){
    if (cookie == null) cookie = await this.#login();

    for(const player of players){
      this.#assignSpp(cookie, player.id, player.spp);
    }
    return cookie;
  }

  async clearMng(cookie, players){
    if (cookie == null) cookie = await this.#login();

    for(const player of players){
      this.#clearMng(cookie, player.id);
    }
    return cookie;
  }

  async awardCash(cookie, cash){
    if (cookie == null) cookie = await this.#login();

    this.#assignCash(cookie, cash);
    return cookie;
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

  async #clearMng(cookie, playerId){
    const data = new Map();
    data.set("query", "set_miss_next_game");
    data.set("bb3_set_miss_next_game_Player", playerId);
    data.set("bb3_set_miss_next_game_MissNextGame", "false");

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

  async #adminCall(cookie, formData){
    const resp = await fetch(this.url, {
        method: "POST",
        headers:{
            cookie:cookie
        },
        body: formData,
    });

    const data = await resp.text();
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
