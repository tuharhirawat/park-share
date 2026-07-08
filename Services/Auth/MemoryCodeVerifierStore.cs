using Microsoft.Extensions.Caching.Memory;

namespace ParkMitra_BE.Services.Auth
{
    public class MemoryCodeVerifierStore : ICodeVerifierStore
    {
        private readonly IMemoryCache _cache;

        public MemoryCodeVerifierStore(IMemoryCache cache)
        {
            _cache = cache;
        }

        public void Save(string state, string codeVerifier) =>
            _cache.Set(state, codeVerifier, TimeSpan.FromMinutes(5));

        public string? Consume(string state)
        {
            if (_cache.TryGetValue(state, out string? verifier))
            {
                _cache.Remove(state);
                return verifier;
            }
            return null;
        }
    }
}