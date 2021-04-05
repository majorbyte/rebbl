using AutoMapper;
using rebbl.Server.Entities;
using rebbl.Shared.Models;

namespace rebbl.Server.Profiles
{
    public class CompetitionProfile : Profile
    {
        public CompetitionProfile() 
        {
            CreateMap<Competition, CompetitionModel>();
        }
    }
}
