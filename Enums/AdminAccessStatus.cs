namespace ParkMitra_BE.Enums
{
    public enum AdminAccessStatus
    {
        unauthenticated,   // missing, expired or invalid token -> 401
        blocked,           // profile status is not ACTIVE      -> 403
        notadmin,          // no admin role                     -> 403
        granted
    }
}
