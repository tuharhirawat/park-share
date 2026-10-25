namespace ParkMitra_BE.DTOs.Location;

public class StateDto
{
    public Guid id { get; set; }
    public string name { get; set; } = null!;
    public string? code { get; set; }
}