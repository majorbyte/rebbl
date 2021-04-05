using System.Collections.Generic;

namespace rebbl.Server.Entities
{
    public class Coach
    {
        public int Id { get; set; }
        public string Name { get; set; }

        public ApplicationUser ApplicationUser { get; set; }


        public IReadOnlyCollection<Match> HomeMatches { get; set; }
        public IReadOnlyCollection<Match> AwayMatches{ get; set; }
        public IReadOnlyCollection<Team> Teams { get; set; }
        public IReadOnlyCollection<Contest> HomeContests { get; set; }
        public IReadOnlyCollection<Contest> AwayContests { get; set; }
    }
}
