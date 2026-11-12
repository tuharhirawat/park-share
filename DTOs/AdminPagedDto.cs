namespace ParkMitra_BE.DTOs
{
    public class AdminPagedDto<T>
    {
        public List<T> Data { get; set; } = new();
        public int Page { get; set; }
        public int Limit { get; set; }
        public int Total { get; set; }
        public int TotalPages { get; set; }
    }
}
