using System.Collections.Generic;

namespace rebbl.Server.Entities
{
    public class League
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Logo { get; set; }

        public IEnumerable<Competition> Competitions { get; set; }
    }
}
