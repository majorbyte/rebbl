namespace rebbl.Shared.Models
{
    public class CompetitionModel
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Format { get; set; }
        public int Status { get; set; }
        public int Rounds { get; set; }
        public int Round { get; set; }
        public int LeagueId { get; set; }
    }
}
