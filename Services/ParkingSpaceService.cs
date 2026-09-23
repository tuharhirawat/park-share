using GeoTimeZone;
using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs;
using ParkMitra_BE.DTOs.Host;
using ParkMitra_BE.DTOs.ParkingSpace;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Helpers;
using ParkMitra_BE.Mappers;
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

        public async Task<ApiResponseDto> CreateParkingSpaceAsync(Guid userId, CreateParkingSpaceDto dto)
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
                CarSlots = slotCounts.FirstOrDefault(x => x.space_id == s.id && x.vehicle_type == VehicleType.Car)?.Count ?? 0,
                BikeSlots = slotCounts.FirstOrDefault(x => x.space_id == s.id && x.vehicle_type == VehicleType.Bike)?.Count ?? 0,
                TitleCooldown = ParkingSpaceCooldownHelper.GetCooldown(s.last_title_change_at),
                CityCooldown = ParkingSpaceCooldownHelper.GetCooldown(s.last_city_change_at),
                AddressCooldown = ParkingSpaceCooldownHelper.GetCooldown(s.last_address_change_at),
                FeaturesCooldown = ParkingSpaceCooldownHelper.GetCooldown(s.last_feature_change_at),
                PricePerHourCooldown = ParkingSpaceCooldownHelper.GetCooldown(s.last_price_per_hour_change_at),
                PricePerDayCooldown = ParkingSpaceCooldownHelper.GetCooldown(s.last_price_per_day_change_at),
            }).ToList();
        }

        public async Task<ApiResponseDto> UpdateParkingSpaceAsync(Guid userId, Guid spaceId, CreateParkingSpaceDto dto)
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

        public async Task<List<ParkingSpaceSearchDto>> SearchAsync(Guid? currentUserId)
        {
            var query = _context.parking_spaces
                .Where(s => s.available && s.listing_status == "approved");

            if (currentUserId.HasValue)
            {
                query = query.Where(s => s.user_id != currentUserId.Value);
            }

            var spaces = await query
                .OrderByDescending(s => s.created_at)
                .ToListAsync();

            if (spaces.Count == 0)
                return new List<ParkingSpaceSearchDto>();

            var spaceIds = spaces.Select(s => s.id).ToList();

            var titleUpdates = await _context.parking_space_update_requests
                .Where(u => u.field == "title"
                    && spaceIds.Contains(u.space_id)
                    && (u.status == "APPROVED" || u.status == "PENDING"))
                .OrderByDescending(u => u.created_at)
                .ToListAsync();

            var latestTitleBySpace = titleUpdates
                .GroupBy(u => u.space_id)
                .ToDictionary(g => g.Key, g => g.First());

            return spaces.Select(s =>
            {
                var displayTitle = s.title;

                if (latestTitleBySpace.TryGetValue(s.id, out var update)
                    && !string.IsNullOrEmpty(update.old_value)
                    && !string.IsNullOrEmpty(update.new_value)
                    && update.new_value != update.old_value)
                {
                    displayTitle = $"{update.new_value} (earlier {update.old_value})";
                }

                return new ParkingSpaceSearchDto
                {
                    Id = s.id,
                    Title = displayTitle,
                    Address = s.address,
                    City = s.city,
                    PricePerHour = s.price_per_hour,
                    PricePerDay = s.price_per_day,
                    VehicleTypes = s.vehicle_types,
                    Features = s.features,
                    Rating = s.rating,
                    ReviewCount = s.review_count,
                    ImageUrls = s.image_urls,
                    Lat = s.lat,
                    Lng = s.lng,
                    Available = s.available,
                    Timezone =s.timezone
                };
            }).ToList();
        }

        public async Task<ParkingSpaceSearchDto?> GetSpaceByIdAsync(Guid id, Guid? currentUserId)
        {
            var space = await _context.parking_spaces
                .FirstOrDefaultAsync(s => s.id == id && s.available && s.listing_status == "approved");

            if (space == null) return null;

            if (currentUserId.HasValue && space.user_id == currentUserId.Value)
                return null;

            var update = await _context.parking_space_update_requests
                .Where(u => u.field == "title"
                    && u.space_id == id
                    && (u.status == "APPROVED" || u.status == "PENDING"))
                .OrderByDescending(u => u.created_at)
                .FirstOrDefaultAsync();

            var displayTitle = space.title;
            if (update != null
                && !string.IsNullOrEmpty(update.old_value)
                && !string.IsNullOrEmpty(update.new_value)
                && update.new_value != update.old_value)
            {
                displayTitle = $"{update.new_value} (earlier {update.old_value})";
            }

            return new ParkingSpaceSearchDto
            {
                Id = space.id,
                Title = displayTitle,
                Address = space.address,
                City = space.city,
                PricePerHour = space.price_per_hour,
                PricePerDay = space.price_per_day,
                VehicleTypes = space.vehicle_types,
                Features = space.features,
                Rating = space.rating,
                ReviewCount = space.review_count,
                ImageUrls = space.image_urls,
                Lat = space.lat,
                Lng = space.lng,
                Available = space.available,
                Timezone = space.timezone
            };
        }

        public async Task<List<ParkingSlotDto>> GetAvailableSlotsAsync(Guid spaceId)
        {
            return await _context.parking_slots
                .Where(s => s.space_id == spaceId && s.is_active)
                .OrderBy(s => s.label)
                .Select(s => new ParkingSlotDto
                {
                    Id = s.id,
                    Label = s.label,
                    VehicleType = s.vehicle_type,
                    IsActive = s.is_active
                })
                .ToListAsync();
        }

        public async Task<UpdateSpaceDetailsResultDto> UpdateSpaceDetailsAsync(Guid userId, Guid spaceId, UpdateSpaceDetailsRequestDto dto)
        {
            var space = await _context.parking_spaces
                .FirstOrDefaultAsync(s => s.id == spaceId && s.user_id == userId);

            if (space == null)
                return new UpdateSpaceDetailsResultDto { Success = false, Message = "Listing not found." };

            var now = DateTime.UtcNow;
            var errors = new Dictionary<string, string>();

            var titleChanged = dto.Title.Trim() != space.title;
            var cityChanged = dto.City.Trim() != space.city;
            var addressChanged = dto.Address.Trim() != space.address;
            var featuresChanged = !FeaturesEqual(dto.Features, space.features);
            var pricePerHourChanged = dto.PricePerHour != space.price_per_hour;
            var pricePerDayChanged = dto.PricePerDay != space.price_per_day;

            if (titleChanged && ParkingSpaceCooldownHelper.IsCooldownActive(space.last_title_change_at))
            {
                errors["title"] = $"Can be changed after {ParkingSpaceCooldownHelper.GetRemainingDays(space.last_title_change_at)} days";
            }

            if (cityChanged && ParkingSpaceCooldownHelper.IsCooldownActive(space.last_city_change_at))
            {
                errors["city"] = $"Can be changed after {ParkingSpaceCooldownHelper.GetRemainingDays(space.last_city_change_at)} days";
            }

            if (addressChanged && ParkingSpaceCooldownHelper.IsCooldownActive(space.last_address_change_at))
            {
                errors["address"] = $"Can be changed after {ParkingSpaceCooldownHelper.GetRemainingDays(space.last_address_change_at)} days";
            }

            if (featuresChanged && ParkingSpaceCooldownHelper.IsCooldownActive(space.last_feature_change_at))
            {
                errors["features"] = $"Can be changed after {ParkingSpaceCooldownHelper.GetRemainingDays(space.last_feature_change_at)} days";
            }

            if (pricePerHourChanged && ParkingSpaceCooldownHelper.IsCooldownActive(space.last_price_per_hour_change_at))
            {
                errors["pricePerHour"] = $"Can be changed after {ParkingSpaceCooldownHelper.GetRemainingDays(space.last_price_per_hour_change_at)} days";
            }

            if (pricePerDayChanged && ParkingSpaceCooldownHelper.IsCooldownActive(space.last_price_per_day_change_at))
            {
                errors["pricePerDay"] = $"Can be changed after {ParkingSpaceCooldownHelper.GetRemainingDays(space.last_price_per_day_change_at)} days";
            }

            if (errors.Count > 0)
            {
                return new UpdateSpaceDetailsResultDto
                {
                    Success = false,
                    Message = "Some fields can't be changed yet.",
                    FieldErrors = errors
                };
            }

            var requests = new List<parking_space_update_request>();

            if (titleChanged)
            {
                requests.Add(NewUpdateRequest(spaceId, "title", space.title, dto.Title.Trim()));
                space.title = dto.Title.Trim();
                space.last_title_change_at = now;
            }

            if (cityChanged)
            {
                requests.Add(NewUpdateRequest(spaceId, "city", space.city, dto.City.Trim()));
                space.city = dto.City.Trim();
                space.last_city_change_at = now;
            }

            if (addressChanged)
            {
                requests.Add(NewUpdateRequest(spaceId, "address", space.address, dto.Address.Trim()));
                space.address = dto.Address.Trim();
                space.lat = dto.Lat;
                space.lng = dto.Lng;
                space.last_address_change_at = now;
            }

            if (featuresChanged)
            {
                space.features = dto.Features;
                space.last_feature_change_at = now;
            }

            if (pricePerHourChanged)
            {
                space.price_per_hour = dto.PricePerHour;
                space.last_price_per_hour_change_at = now;
            }

            if (pricePerDayChanged)
            {
                space.price_per_day = dto.PricePerDay;
                space.last_price_per_day_change_at = now;
            }

            space.description = dto.Description;
            space.updated_at = now;

            if (requests.Count > 0)
                _context.parking_space_update_requests.AddRange(requests);

            await _context.SaveChangesAsync();

            return new UpdateSpaceDetailsResultDto
            {
                Success = true,
                Message = "Updated successfully",
                Space = HostMapper.MapSpace(space, new HostSpaceStatsDto())
            };
        }

        public async Task<List<HostSlotDto>> GetSpaceSlotsBySpaceIdAsync(Guid userId, Guid spaceId)
        {
            var ownsSpace = await _context.parking_spaces
                .AnyAsync(s => s.id == spaceId && s.user_id == userId);
            if (!ownsSpace) return new List<HostSlotDto>();

            var slots = await _context.parking_slots
                .Where(s => s.space_id == spaceId)
                .OrderBy(s => s.label)
                .ToListAsync();

            return slots.Select(HostMapper.MapSlot).ToList();
        }

        // Helper methods

        private static string ResolveTimezone(double lat, double lng)
        {
            try
            {
                return TimeZoneLookup.GetTimeZone(lat, lng).Result;
            }
            catch
            {
                return "Asia/Kolkata";
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
                    vehicle_type = VehicleType.Car,
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
                    vehicle_type = VehicleType.Bike,
                    is_active = true,
                    created_at = DateTime.UtcNow,
                    updated_at = DateTime.UtcNow
                });
            }

            return slots;
        }

        private static bool FeaturesEqual(List<string>? a, List<string>? b)
        {
            a ??= new List<string>();
            b ??= new List<string>();
            return a.OrderBy(x => x).SequenceEqual(b.OrderBy(x => x));
        }

        private static parking_space_update_request NewUpdateRequest(
            Guid spaceId, string field, string? oldValue, string? newValue) => new()
            {
                id = Guid.NewGuid(),
                space_id = spaceId,
                field = field,
                old_value = oldValue,
                new_value = newValue,
                status = "PENDING",
                created_at = DateTime.UtcNow
            };
    }
}