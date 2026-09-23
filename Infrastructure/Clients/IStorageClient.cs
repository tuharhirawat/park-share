namespace ParkMitra_BE.Infrastructure.Clients;

public interface IStorageClient
{
    Task<HttpResponseMessage> UploadFileAsync(string bucket, string path, byte[] fileBytes, string contentType);
    string GetPublicUrl(string bucket, string path);
    Task<HttpResponseMessage> DeleteFileAsync(string bucket, string path);
}