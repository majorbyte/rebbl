namespace rebbl.Shared.Models
{
    public class ContestModel
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


        public CompetitionModel Competition { get; set; }
    }
}
