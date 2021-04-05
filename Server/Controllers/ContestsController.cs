using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using rebbl.Server.Entities;
using rebbl.Server.Migrations.Seed;
using rebbl.Server.Services;
using rebbl.Shared.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace rebbl.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ContestsController : ControllerBase
    {
        private readonly ContestService _contestService;
        private readonly IMapper _mapper;
        private readonly Seeding _seed;
        public ContestsController(ContestService contestService, IMapper mapper, Seeding seed) 
        {
            _contestService = contestService;
            _mapper = mapper;
            _seed = seed;
        }

        [HttpGet("{competitionId:int}")]
        public async Task<IActionResult> Get(int competitionId) 
        {
            //await _seed.MigrateTeams();
            //await _seed.MigrateCompetitions();
            //await _seed.MigrateContests(42291, "REBBL - GMan");

            var data = await _contestService.GetContests(competitionId);

            return Ok(_mapper.Map<IEnumerable<ContestModel>>(data));
        }
    }
}
