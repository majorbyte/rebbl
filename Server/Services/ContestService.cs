using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using rebbl.Server.Data;
using rebbl.Server.Entities;

namespace rebbl.Server.Services
{
    public class ContestService : BaseService<Contest>
    {
        public ContestService(ApplicationDbContext context) : base(context) { }

        public async Task<IReadOnlyCollection<Contest>> GetContests(int competitionId) 
        {
            return await _context.Contests
                .Include(x => x.Competition)
                .Where(x => x.CompetitionId == competitionId).ToListAsync();
        }
    }
}
