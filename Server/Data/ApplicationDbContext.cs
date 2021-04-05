using IdentityServer4.EntityFramework.Options;
using Microsoft.AspNetCore.ApiAuthorization.IdentityServer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.Extensions.Options;
using rebbl.Server.Entities;

namespace rebbl.Server.Data
{
    public class ApplicationDbContext : ApiAuthorizationDbContext<ApplicationUser>
    {
        public ApplicationDbContext(
            DbContextOptions options,
            IOptions<OperationalStoreOptions> operationalStoreOptions) : base(options, operationalStoreOptions)
        {

        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.HasDefaultSchema("public");
            modelBuilder.Entity<Coach>(ConfigureCoach);
            modelBuilder.Entity<League>(ConfigureLeague);
            modelBuilder.Entity<Competition>(ConfigureCompetition);
            modelBuilder.Entity<Contest>(ConfigureContest);
            modelBuilder.Entity<Match>(ConfigureMatch);
            modelBuilder.Entity<MatchTeam>(ConfigureMatchTeam);
            modelBuilder.Entity<MatchPlayer>(ConfigureMatchPlayer);
            modelBuilder.Entity<Team>(ConfigureTeam);
            modelBuilder.Entity<Player>(ConfigurePlayer);
        }
        private void ConfigureApplicationUser(EntityTypeBuilder<ApplicationUser> builder)
        {
        }

        public DbSet<Coach> Coaches { get; set; }
        private void ConfigureCoach(EntityTypeBuilder<Coach> builder)
        {
            builder.HasKey(coach => coach.Id);

            builder
                .HasOne(coach => coach.ApplicationUser)
                .WithOne(user => user.Coach)
                .HasForeignKey<ApplicationUser>(user => new { user.CoachId })
                .OnDelete(DeleteBehavior.NoAction);


            builder
                .HasMany(coach => coach.Teams)
                .WithOne(team => team.Coach)
                .OnDelete(DeleteBehavior.NoAction);

            builder
                .HasMany(coach => coach.HomeContests)
                .WithOne(contest => contest.HomeCoach)
                .OnDelete(DeleteBehavior.NoAction);

            builder
                .HasMany(coach => coach.AwayContests)
                .WithOne(contest => contest.AwayCoach)
                .OnDelete(DeleteBehavior.NoAction);
            
            builder
                .HasMany(coach => coach.HomeMatches)
                .WithOne(contest => contest.HomeCoach)
                .OnDelete(DeleteBehavior.NoAction);

            builder
                .HasMany(coach => coach.AwayMatches)
                .WithOne(contest => contest.AwayCoach)
                .OnDelete(DeleteBehavior.NoAction);
        }
        public DbSet<League> Leagues { get; set; }
        private void ConfigureLeague(EntityTypeBuilder<League> builder)
        {
            builder.HasKey(league => league.Id);

            builder
                .HasMany(league => league.Competitions)
                .WithOne(competition => competition.League)
                .HasForeignKey(c => new { c.LeagueId })
                .OnDelete(DeleteBehavior.NoAction);
        }
        public DbSet<Competition> Competitions { get; set; }
        private void ConfigureCompetition(EntityTypeBuilder<Competition> builder)
        {
            builder.HasKey(competition => competition.Id);

            builder
                .HasMany(competition => competition.Contests)
                .WithOne(contest => contest.Competition)
                .HasForeignKey(c => c.CompetitionId)
                .OnDelete(DeleteBehavior.NoAction);
        }
        public DbSet<Contest> Contests { get; set; }
        private void ConfigureContest(EntityTypeBuilder<Contest> builder)
        {
            builder.HasKey(contest => contest.Id);

            builder
                .HasOne(contest => contest.Match)
                .WithOne()
                .HasForeignKey<Contest>(c => c.MatchUuid)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.NoAction);

        }
        public DbSet<Match> Matches { get; set; }
        private void ConfigureMatch(EntityTypeBuilder<Match> builder)
        {
            builder.HasKey(match => match.Id);

            builder
                .HasOne(match => match.HomeTeam)
                .WithOne()
                .HasForeignKey<MatchTeam>(team => new { team.MatchId, team.TeamId })
                .HasPrincipalKey<Match>(match => new { match.Id, match.HomeTeamId })
                .IsRequired(false)
                .OnDelete(DeleteBehavior.NoAction);

            builder
                .HasOne(match => match.AwayTeam)
                .WithOne()
                .HasForeignKey<MatchTeam>(team => new { team.MatchId, team.TeamId })
                .HasPrincipalKey<Match>(match => new { match.Id, match.AwayTeamId })
                .IsRequired(false)
                .OnDelete(DeleteBehavior.NoAction);

        }
        public DbSet<MatchTeam> MatchTeams { get; set; }
        private void ConfigureMatchTeam(EntityTypeBuilder<MatchTeam> builder)
        {
            builder.HasKey(team => new { team.MatchId, team.TeamId });

        }
        public DbSet<MatchPlayer> MatchPlayers { get; set; }
        private void ConfigureMatchPlayer(EntityTypeBuilder<MatchPlayer> builder)
        {
            builder.HasKey(player => new { player.MatchId, player.TeamId, player.PlayerId });

            builder
                .HasOne(player => player.Team)
                .WithMany(team => team.Players)
                .HasForeignKey(x => new { x.MatchId, x.TeamId })
                .OnDelete(DeleteBehavior.NoAction);
        }
        public DbSet<Team> Teams { get; set; }
        private void ConfigureTeam(EntityTypeBuilder<Team> builder)
        {
            builder.HasKey(team => team.Id);

            builder
                .HasMany(team => team.HomeMatches)
                .WithOne()
                .HasForeignKey(x => new { x.HomeTeamId });

            builder
                .HasMany(team => team.AwayMatches)
                .WithOne()
                .HasForeignKey(x => new { x.AwayTeamId });

        }
        public DbSet<MatchPlayer> Players { get; set; }
        private void ConfigurePlayer(EntityTypeBuilder<Player> builder)
        {
            builder.HasKey(player => player.Id);

            builder
                .HasOne(player => player.Team)
                .WithMany(team => team.Players)
                .OnDelete(DeleteBehavior.NoAction);
        }

    }
}
