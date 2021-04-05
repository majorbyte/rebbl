using System;
using System.Collections.Generic;

namespace rebbl.Server.Entities
{
    public class Team
    {
        public int Id { get; set; }
        public DateTime Created { get; set; }
        public DateTime DateLastMatch { get; set; }
        public string Name { get; set; }
        public int CoachId { get; set; }
        public int RaceId { get; set; }
        public string Logo { get; set; }
        public int TeamColor { get; set; }
        public string Motto { get; set; }
        public int Value { get; set; }
        public int FanFactor { get; set; }
        public int Cash { get; set; }
        public int CheerLeaders { get; set; }
        public int Balms { get; set; }
        public int Apothecary { get; set; }
        public int Necromancer { get; set; }
        public int Rerolls { get; set; }
        public int AssistantCoaches { get; set; }
        public string StadiumName { get; set; }
        public int StadiumLevel { get; set; }
        public string StadiumType { get; set; }
        public string StadiumUpgrade { get; set; }
        public int NextMatchValue { get; set; }
        public int ActualValue { get; set; }

        public Coach Coach { get; set; }
        public IReadOnlyCollection<Match> HomeMatches { get; set; }
        public IReadOnlyCollection<Match> AwayMatches { get; set; }
        public IReadOnlyCollection<Player> Players { get; set; }

    }
}
