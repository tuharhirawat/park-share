using GeoTimeZone;
using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs;
using ParkMitra_BE.DTOs.ParkingSpace;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Services
{
    public class ParkingSpaceService
    {
        private readonly ApplicationDbContext _context;

        public ParkingSpaceService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ApiResponseDto> CreateAsync(Guid userId, CreateParkingSpaceDto dto)
        {
            if (dto.CarSlots == 0 && dto.BikeSlots == 0)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "At least 1 slot is required."
                };
            }

            var timezone = ResolveTimezone(dto.Lat, dto.Lng);
            var vehicleTypes = BuildVehicleTypes(dto.CarSlots, dto.BikeSlots);

            var space = new parking_space
            {
                id = Guid.NewGuid(),
                user_id = userId,
                title = dto.Title.Trim(),
                address = dto.Address.Trim(),
                city = dto.City.Trim(),
                price_per_hour = dto.PricePerHour,
                price_per_day = dto.PricePerDay,
                vehicle_types = vehicleTypes,
                features = dto.Features,
                description = dto.Description,
                image_urls = dto.ImageUrls,
                lat = dto.Lat,
                lng = dto.Lng,
                timezone = timezone,
                available = true,
                listing_status = "pending",
                rating = 0,
                review_count = 0,
                reapply_count = 0,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow
            };

            await using var transaction = await _context.Database.BeginTransactionAsync();

            _context.parking_spaces.Add(space);
            await _context.SaveChangesAsync();

            var slots = BuildSlots(space.id, dto.CarSlots, dto.BikeSlots);
            _context.parking_slots.AddRange(slots);
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return new ApiResponseDto
            {
                Success = true,
                Message = "Your parking space has been listed!"
            };
        }

        public async Task<List<ParkingSpaceDto>> GetMySpacesAsync(Guid userId)
        {
            var spaces = await _context.parking_spaces
                .Where(s => s.user_id == userId)
                .OrderByDescending(s => s.created_at)
                .ToListAsync();

            if (spaces.Count == 0)
                return new List<ParkingSpaceDto>();

            var spaceIds = spaces.Select(s => s.id).ToList();

            var slotCounts = await _context.parking_slots
                .Where(sl => spaceIds.Contains(sl.space_id))
                .GroupBy(sl => new { sl.space_id, sl.vehicle_type })
                .Select(g => new { g.Key.space_id, g.Key.vehicle_type, Count = g.Count() })
                .ToListAsync();

            return spaces.Select(s => new ParkingSpaceDto
            {
                Id = s.id,
                Title = s.title,
                Address = s.address,
                City = s.city,
                PricePerHour = s.price_per_hour,
                PricePerDay = s.price_per_day,
                VehicleTypes = s.vehicle_types,
                Features = s.features,
                Description = s.description,
                ImageUrls = s.image_urls,
                Rating = s.rating,
                ReviewCount = s.review_count,
                Lat = s.lat,
                Lng = s.lng,
                Timezone = s.timezone,
                Available = s.available,
                ListingStatus = s.listing_status,
                RejectionReason = s.rejection_reason,
                ReapplyCount = s.reapply_count,
                CreatedAt = s.created_at,
                CarSlots = slotCounts.FirstOrDefault(x => x.space_id == s.id && x.vehicle_type == "car")?.Count ?? 0,
                BikeSlots = slotCounts.FirstOrDefault(x => x.space_id == s.id && x.vehicle_type == "bike")?.Count ?? 0
            }).ToList();
        }

        public async Task<ApiResponseDto> UpdateAsync(Guid userId, Guid spaceId, CreateParkingSpaceDto dto)
        {
            var space = await _context.parking_spaces
                .FirstOrDefaultAsync(s => s.id == spaceId && s.user_id == userId);

            if (space == null)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Listing not found."
                };
            }

            if (dto.CarSlots == 0 && dto.BikeSlots == 0)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "At least 1 slot is required."
                };
            }

            var timezone = ResolveTimezone(dto.Lat, dto.Lng);
            var vehicleTypes = BuildVehicleTypes(dto.CarSlots, dto.BikeSlots);

            space.title = dto.Title.Trim();
            space.address = dto.Address.Trim();
            space.city = dto.City.Trim();
            space.price_per_hour = dto.PricePerHour;
            space.price_per_day = dto.PricePerDay;
            space.vehicle_types = vehicleTypes;
            space.features = dto.Features;
            space.description = dto.Description;
            space.image_urls = dto.ImageUrls;
            space.lat = dto.Lat;
            space.lng = dto.Lng;
            space.timezone = timezone;
            space.updated_at = DateTime.UtcNow;

            // Server-owned: resubmitting for review always resets these, client cannot set them
            space.listing_status = "pending";
            space.reviewed_by = null;
            space.reviewed_at = null;
            space.rejection_reason = null;

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var existingSlots = await _context.parking_slots
                .Where(s => s.space_id == spaceId)
                .ToListAsync();

            _context.parking_slots.RemoveRange(existingSlots);
            await _context.SaveChangesAsync();

            var newSlots = BuildSlots(spaceId, dto.CarSlots, dto.BikeSlots);
            _context.parking_slots.AddRange(newSlots);
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return new ApiResponseDto
            {
                Success = true,
                Message = "Listing resubmitted for review."
            };
        }

        private static string ResolveTimezone(double lat, double lng)
        {
            try
            {
                return TimeZoneLookup.GetTimeZone(lat, lng).Result;
            }
            catch
            {
                return "Asia/Kolkata"; // safe fallback if lookup fails for edge-case coordinates
            }
        }

        private static List<string> BuildVehicleTypes(int carSlots, int bikeSlots)
        {
            var types = new List<string>();
            if (carSlots > 0) types.Add("car");
            if (bikeSlots > 0) types.Add("bike");
            return types;
        }

        private static List<parking_slot> BuildSlots(Guid spaceId, int carSlots, int bikeSlots)
        {
            var slots = new List<parking_slot>();

            for (int i = 1; i <= carSlots; i++)
            {
                slots.Add(new parking_slot
                {
                    id = Guid.NewGuid(),
                    space_id = spaceId,
                    label = $"C-{i}",
                    vehicle_type = "car",
                    is_active = true,
                    created_at = DateTime.UtcNow,
                    updated_at = DateTime.UtcNow
                });
            }

            for (int i = 1; i <= bikeSlots; i++)
            {
                slots.Add(new parking_slot
                {
                    id = Guid.NewGuid(),
                    space_id = spaceId,
                    label = $"B-{i}",
                    vehicle_type = "bike",
                    is_active = true,
                    created_at = DateTime.UtcNow,
                    updated_at = DateTime.UtcNow
                });
            }

            return slots;
        }
    }
}