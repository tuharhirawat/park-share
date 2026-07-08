using System.Security.Cryptography;
using System.Text;

namespace ParkMitra_BE.Services.Auth
{
    public static class Pkce
    {
        public static (string Verifier, string Challenge) Generate()
        {
            var bytes = RandomNumberGenerator.GetBytes(32);
            var verifier = Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

            using var sha256 = SHA256.Create();
            var challengeBytes = sha256.ComputeHash(Encoding.ASCII.GetBytes(verifier));
            var challenge = Convert.ToBase64String(challengeBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

            return (verifier, challenge);
        }
    }
}