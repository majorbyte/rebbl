using System;

namespace rebbl.Server.Entities
{
    public class Match
    {
        public string Id { get; set; }
        public int CompetitionId { get; set; }
        public DateTime Started { get; set; }
        public DateTime Finished { get; set; }
        public int Round { get; set; }
        public string Stadium { get; set; }
        public string StadiumEnhancement { get; set; }
        public int HomeTeamId { get; set; }
        public int AwayTeamId { get; set; }
        public int HomeCoachId { get; set; }
        public int AwayCoachId { get; set; }

        public Competition Competition { get; set; }
        public MatchTeam HomeTeam { get; set; }
        public MatchTeam AwayTeam { get; set; }
        public Coach HomeCoach { get; set; }
        public Coach AwayCoach{ get; set; }
    }

}
