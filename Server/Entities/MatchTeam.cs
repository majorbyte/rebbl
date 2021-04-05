using System.Collections.Generic;

namespace rebbl.Server.Entities
{
    public class MatchTeam
    {
        public string MatchId { get; set; }
        public int TeamId { get; set; }
        public int CompetitionId { get; set; }
        public int TV { get; set; }
        public int Score { get; set; }
        public int CashBeforeMatch { get; set; }
        public int PopularityBeforeMatch { get; set; }
        public int PopularityGain { get; set; }
        public int CashSpentInducements { get; set; }
        public int CashEarned { get; set; }
        public int CashEarnedBeforeConcession { get; set; }
        public int WinningsDice { get; set; }
        public int SpirallingExpenses { get; set; }
        public int Supporters { get; set; }
        public int PossessionBall { get; set; }
        public int OccupationOwn { get; set; }
        public int OccupationTheir { get; set; }
        public int MVP { get; set; }
        public int InflictedPasses { get; set; }
        public int InflictedCatches { get; set; }
        public int InflictedInterceptions { get; set; }
        public int InflictedTouchdowns { get; set; }
        public int InflictedCasualties { get; set; }
        public int Inflictedtackles { get; set; }
        public int InflictedKO { get; set; }
        public int InflictedInjuries { get; set; }
        public int InflictedDead { get; set; }
        public int InflictedMetersRunning { get; set; }
        public int InflictedMetersPassing { get; set; }
        public int InflictedPushouts { get; set; }
        public int SustainedExpulsions { get; set; }
        public int SustainedCasualties { get; set; }
        public int SustainedKO { get; set; }
        public int SustainedInjuries { get; set; }
        public int SustainedDead { get; set; }

        public IEnumerable<MatchPlayer> Players { get; set; }
    }
}
