namespace rebbl.Server.Entities
{
    public class Contest
    {
        public int Id { get; set; }
        public int CompetitionId { get; set; }
        public int? Round { get; set; }
        public string MatchType { get; set; }
        public string Status { get; set; }
        public string Stadium { get; set; }
        public int? HomeCoachId { get; set; }
        public int HomeTeamId { get; set; }
        public int HomeTV { get; set; }
        public int? HomeScore { get; set; }
        public int? HomeDeath { get; set; }
        public int? AwayCoachId { get; set; }
        public int AwayTeamId { get; set; }
        public int AwayTV { get; set; }
        public int? AwayScore { get; set; }
        public int? AwayDeath { get; set; }
        public string? MatchUuid { get; set; }
        public int? MatchId { get; set; }

        
        public Competition Competition { get; set; }
        public Match Match { get; set; }

        public Coach HomeCoach { get; set; }
        public Team HomeTeam { get; set; }
        public Coach AwayCoach { get; set; }
        public Team AwayTeam { get; set; }
    }
}
