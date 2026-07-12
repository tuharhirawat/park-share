using ParkMitra_BE.Infrastructure.Clients;

namespace ParkMitra_BE.Services
{
    public class ImageUploadService
    {
        private readonly IStorageClient _storageClient;
        private readonly string _bucketName;

        public ImageUploadService(
            IStorageClient storageClient,
            IConfiguration configuration)
        {
            _storageClient = storageClient;
            _bucketName = configuration["ImageUpload:ParkingSpaceImagesBucket"]
                ?? throw new InvalidOperationException("ImageUpload:BucketName is not configured.");
        }

        public async Task<string> UploadAsync(Guid userId, IFormFile file)
        {
            var ext = Path.GetExtension(file.FileName);
            var path = $"{userId}/{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid():N}{ext}";

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            var bytes = stream.ToArray();

            var response = await _storageClient.UploadFileAsync(_bucketName, path, bytes, file.ContentType);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"Image upload failed: {error}");
            }

            return _storageClient.GetPublicUrl(_bucketName, path);
        }
    }
}