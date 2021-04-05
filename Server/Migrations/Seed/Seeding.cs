using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using rebbl.Server.Data;
using rebbl.Server.Entities;
using rebbl.Server.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace rebbl.Server.Migrations.Seed
{
    public class Seeding
    {
        private readonly ApplicationDbContext applicationDbContext;
        private readonly SqlOptions _options;
        public Seeding(ApplicationDbContext context, IOptions<SqlOptions> options) 
        {
            applicationDbContext = context;
            _options = options.Value;
        }


        public async Task MigrateTeams() 
        {
            var client = new MongoClient(_options.MongoUri);
            var database = client.GetDatabase("rebbl");
            var data = await database.GetCollection<BsonDocument>("teams").Find(new BsonDocument { }).ToListAsync<BsonDocument>();

            List<Coach> coaches= new List<Coach>();
            List<Team> teams = new List<Team>();
            var coach = new Coach
            {
                Id = 1,
                Name = "AI"
            };
            coaches.Add(coach);

            foreach (var d in data)
            {
                int teamId = (int)d["team"]["id"];
                if (teams.Any(x => x.Id == teamId)) continue;

                int coachId = (int)d["team"]["idcoach"];
                coachId = coachId > 0 ? coachId : 1;

                try
                {

                    var teamDoc = d["team"].ToBsonDocument();

                    if (coaches.All(x => x.Id != coachId)) { 
                        if (d.TryGetElement("coach", out var e))
                        {
                            coach = new Coach
                            {
                                Id = (int)d["coach"]["id"],
                                Name = d["coach"]["name"].ToString(),
                            };
                        }
                        else if (coachId > 1)
                        {
                            int index = 0;
                            var match = await database.GetCollection<BsonDocument>("matches").Find(new BsonDocument { { "match.coaches.0.idcoach", coachId } }).FirstOrDefaultAsync<BsonDocument>();

                            if (match == default(BsonDocument)) 
                            {
                                index = 1;
                                match = await database.GetCollection<BsonDocument>("matches").Find(new BsonDocument { { "match.coaches.1.idcoach", coachId } }).FirstOrDefaultAsync<BsonDocument>();
                            }

                            coach = new Coach
                            {
                                Id = (int)match["match"]["coaches"][index]["idcoach"],
                                Name = match["match"]["coaches"][index]["coachname"].ToString(),
                            };

                        }

                        coaches.Add(coach);
                    }


                    var team = new Team
                    {
                        CoachId = coachId,
                        Id = teamDoc.GetInt("id"),
                        Name = teamDoc.GetString("name"),
                        Created = teamDoc.GetDateTime("created"),
                        DateLastMatch = teamDoc.GetDateTime("datelastmatch"),
                        RaceId = teamDoc.GetInt("idraces"),
                        Logo = teamDoc.GetString("logo"),
                        TeamColor = teamDoc.GetInt("teamcolor"),
                        Motto = teamDoc.GetString("leitmotiv"),
                        Value = teamDoc.GetInt("value"),
                        FanFactor = teamDoc.GetInt("popularity"),
                        Cash = teamDoc.GetInt("cash"),
                        CheerLeaders = teamDoc.GetInt("cheerleaders"),
                        Balms = teamDoc.GetInt("balms"),
                        Apothecary = teamDoc.GetInt("apothecary"),
                        Rerolls = teamDoc.GetInt("rerolls"),
                        AssistantCoaches = teamDoc.GetInt("assistantcoaches"),
                        StadiumName = teamDoc.GetString("stadiumname"),
                        StadiumLevel = teamDoc.GetInt("stadiumlevel"),
                        StadiumType = teamDoc.GetString("stadiumtype"),
                        NextMatchValue = teamDoc.GetInt("nextMatchTV"),
                        ActualValue = teamDoc.GetInt("actualTV"),
                    };

                    if (teamDoc.TryGetValue("cards", out var _)) 
                    {
                        var cards = teamDoc["cards"].AsBsonArray;

                        for (var i = 0; i < cards.Count; i++)
                        {
                            if (cards[i]["name"] == "Necromancer") team.Necromancer = 1;
                            if (cards[i]["type"] == "Building") team.StadiumUpgrade = (string)cards[i]["name"];
                        }
                    }

                    teams.Add(team);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("o-oh");
                }

            }

            applicationDbContext.Coaches.AddRange(coaches);
            await applicationDbContext.SaveChangesAsync();

            applicationDbContext.Teams.AddRange(teams);
            await applicationDbContext.SaveChangesAsync();


        }

        public async Task MigrateCompetitions()
        {
            var client = new MongoClient(_options.MongoUri);
            var database = client.GetDatabase("rebbl");


            var data = await database.GetCollection<BsonDocument>("schedules").Find(new BsonDocument { { "league", "REBBL - GMan" }, }).ToListAsync<BsonDocument>();


            List<Competition> list = new List<Competition>();

            foreach (var d in data)
            {
                try
                {
                    var competition = new Competition 
                    {
                        Id = (int)d["competition_id"],
                        Format = (string)d["format"],
                        Name = (string)d["competition"],
                        LeagueId = 42291
                    };

                    if (list.All(x => x.Id != competition.Id))
                    {
                        list.Add(competition);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("o-oh");
                }
            }
            applicationDbContext.Competitions.AddRange(list);
            await applicationDbContext.SaveChangesAsync();
        }



        public async Task MigrateContests(int leagueId, string league)
        {
            var client = new MongoClient(_options.MongoUri);
            var database = client.GetDatabase("rebbl");


            var data = await database.GetCollection<BsonDocument>("schedules").Find(new BsonDocument { { "league", league }, }).ToListAsync<BsonDocument>();


            foreach (var d in data)
            {
                try
                {
                    var contest = new Contest { 
                        Id = (int)d["contest_id"],
                        CompetitionId = (int)d["competition_id"],
                        Round = (int?)d["round"],
                        MatchType = (string)d["type"],
                        Status = (string)d["status"],
                        Stadium = d["stadium"].IsBsonNull ? null : (string)d["stadium"],
                        HomeCoachId = (int?)d["opponents"][0]["coach"]["id"],
                        HomeTeamId = (int)d["opponents"][0]["team"]["id"],
                        HomeTV = (int)d["opponents"][0]["team"]["value"],
                        HomeScore = (int?)d["opponents"][0]["team"]["score"],
                        HomeDeath = (int?)d["opponents"][0]["team"]["death"],
                        AwayCoachId = (int?)d["opponents"][1]["coach"]["id"],
                        AwayTeamId = (int)d["opponents"][1]["team"]["id"],
                        AwayTV = (int)d["opponents"][1]["team"]["value"],
                        AwayScore = (int?)d["opponents"][1]["team"]["score"],
                        AwayDeath = (int?)d["opponents"][1]["team"]["death"],
                        MatchUuid= null ,// d["match_uuid"].IsBsonNull ? null : (string)d["match_uuid"],
                        MatchId = (int?)d["match_id"]
                    };

                    contest.HomeCoachId = contest.HomeCoachId ?? 1;
                    contest.AwayCoachId = contest.AwayCoachId ?? 1;

                    contest.HomeCoachId = contest.HomeCoachId == 0 ? 1 : contest.HomeCoachId;
                    contest.AwayCoachId = contest.AwayCoachId == 0 ? 1 : contest.AwayCoachId;

                    var coach = await applicationDbContext.Coaches.FirstOrDefaultAsync(x => x.Id == contest.AwayCoachId);

                    if (coach == null) 
                    {
                        Console.WriteLine("here");
                    }

                    applicationDbContext.Contests.Add(contest);

                }
                catch (Exception ex)
                {
                    Console.WriteLine("o");
                }
            }
            await applicationDbContext.SaveChangesAsync();
        }



    }
}
