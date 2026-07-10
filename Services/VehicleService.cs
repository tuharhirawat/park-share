using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs;
using ParkMitra_BE.DTOs.Vehicle;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Services
{
    public class VehicleService
    {
        private readonly ApplicationDbContext _context;

        public VehicleService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<VehicleDto>> GetVehiclesAsync(Guid userId)
        {
            return await _context.vehicles
                .Where(v => v.user_id == userId)
                .OrderByDescending(v => v.created_at)
                .Select(v => new VehicleDto
                {
                    Id = v.id,
                    VehicleType = v.vehicle_type,
                    BrandModel = v.brand_model,
                    RegistrationNumber = v.registration_number,
                    CreatedAt = v.created_at
                })
                .ToListAsync();
        }

        public async Task<ApiResponseDto> AddVehicleAsync(Guid userId, VehicleDto dto)
        {
            var registration = dto.RegistrationNumber
                .Replace(" ", "")
                .Replace("-", "")
                .ToUpperInvariant();

            bool exists = await _context.vehicles.AnyAsync(v =>
                v.registration_number == registration);

            if (exists)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Vehicle with this registration already exists."
                };
            }

            var brandModel = dto.BrandModel.Trim();

            var vehicle = new vehicle
            {
                id = Guid.NewGuid(),
                user_id = userId,
                vehicle_type = dto.VehicleType,
                brand_model = brandModel,
                registration_number = registration,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow
            };

            _context.vehicles.Add(vehicle);

            await _context.SaveChangesAsync();

            return new ApiResponseDto
            {
                Success = true,
                Message = "Vehicle added successfully."
            };
        }

        public async Task<ApiResponseDto> DeleteVehicleAsync(Guid userId, Guid vehicleId)
        {
            var vehicle = await _context.vehicles
                .FirstOrDefaultAsync(v =>
                    v.id == vehicleId &&
                    v.user_id == userId);

            if (vehicle == null)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Vehicle not found."
                };
            }

            _context.vehicles.Remove(vehicle);

            await _context.SaveChangesAsync();

            return new ApiResponseDto
            {
                Success = true,
                Message = "Vehicle deleted successfully."
            };
        }
    }
}
