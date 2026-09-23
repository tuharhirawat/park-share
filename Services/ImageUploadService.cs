using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.Infrastructure.Clients;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Services
{
    public class ImageUploadService
    {
        private readonly IStorageClient _storageClient;
        private readonly string _bucketName;
        private readonly ApplicationDbContext _context;

        public ImageUploadService(
            IStorageClient storageClient,
            IConfiguration configuration,
            ApplicationDbContext context)
        {
            _context = context;
            _storageClient = storageClient;
            _bucketName = configuration["ImageUpload:ParkingSpaceImagesBucket"]
                ?? throw new InvalidOperationException("ImageUpload:BucketName is not configured.");
        }

        public async Task<string> UploadAsync(
            Guid userId,
            IFormFile file,
            Guid? spaceId = null)
        {
            parking_space? space = null;

            if (spaceId.HasValue)
            {
                space = await _context.parking_spaces
                    .FirstOrDefaultAsync(s =>
                        s.id == spaceId.Value &&
                        s.user_id == userId);

                if (space == null)
                    throw new InvalidOperationException("Listing not found.");

                if ((space.image_urls?.Count ?? 0) >= 5)
                    throw new InvalidOperationException("Maximum 5 images per listing.");
            }

            var ext = Path.GetExtension(file.FileName);
            var path = $"{userId}/{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid():N}{ext}";

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            var bytes = stream.ToArray();

            var response = await _storageClient.UploadFileAsync(
                _bucketName,
                path,
                bytes,
                file.ContentType);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"Image upload failed: {error}");
            }

            var url = _storageClient.GetPublicUrl(_bucketName, path);

            if (space != null)
            {
                space.image_urls ??= new List<string>();
                space.image_urls.Add(url);
                space.updated_at = DateTime.UtcNow;

                await _context.SaveChangesAsync();
            }

            return url;
        }

        public async Task RemoveAsync(
            Guid userId,
            Guid spaceId,
            string imageUrl)
        {
            var space = await _context.parking_spaces
                .FirstOrDefaultAsync(s => s.id == spaceId && s.user_id == userId);

            if (space == null)
                throw new InvalidOperationException("Listing not found.");

            if (space.image_urls == null || !space.image_urls.Contains(imageUrl))
            {
                throw new InvalidOperationException("Image not found in this listing.");
            }

            var publicPrefix = _storageClient.GetPublicUrl(_bucketName, "");

            if (!imageUrl.StartsWith(publicPrefix))
            {
                throw new InvalidOperationException("Invalid image URL.");
            }

            var storagePath = imageUrl.Substring(publicPrefix.Length);

            space.image_urls.Remove(imageUrl);
            space.updated_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var response = await _storageClient.DeleteFileAsync(_bucketName, storagePath);

            if (!response.IsSuccessStatusCode)
            {
                // The DB update succeeded, but storage deletion failed.
                // We don't put the URL back because the listing no longer
                // references the image.
                var error = await response.Content.ReadAsStringAsync();

                throw new InvalidOperationException($"Image was removed from the listing, but storage deletion failed: {error}");
            }
        }
    }
}