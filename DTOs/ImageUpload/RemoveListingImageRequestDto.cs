namespace ParkMitra_BE.DTOs.ImageUpload
{
    public class RemoveListingImageRequestDto
    {
        public Guid SpaceId { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
    }
}
