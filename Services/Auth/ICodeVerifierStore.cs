namespace ParkMitra_BE.Services.Auth
{
    public interface ICodeVerifierStore
    {
        void Save(string state, string codeVerifier);
        string? Consume(string state);
    }
}