using AutoMapper;
using rebbl.Server.Entities;
using rebbl.Shared.Models;

namespace rebbl.Server.Profiles
{
    public class ContestProfile : Profile
    {
        public ContestProfile() 
        {
            CreateMap<Contest, ContestModel>();
        }
    }
}
