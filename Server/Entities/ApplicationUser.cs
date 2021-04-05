using Microsoft.AspNetCore.Identity;

namespace rebbl.Server.Entities
{
    public class ApplicationUser : IdentityUser
    {
        public int CoachId { get; set;}

        public Coach Coach { get; set; }
    }
}
