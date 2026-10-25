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
            var cityExists = await _context.cities
                .AnyAsync(c =>
                    c.id == dto.CityId &&
                    c.is_active &&
                    c.state.is_active);

            if (!cityExists)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Selected city is invalid."
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

            var space = new parking_space
            {
                id = Guid.NewGuid(),
                user_id = userId,
                title = dto.Title.Trim(),
                address = dto.Address.Trim(),
                city_id = dto.CityId,
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

        public async Task<PagedResultDto<HostSpaceListingDto>> GetMySpaceListingsAsync(
            Guid userId,
            HostSpaceListingStatus status,
            int page)
        {
            const int pageSize = 10;
            page = Math.Max(page, 1);

            var query = _context.parking_spaces
                .AsNoTracking()
                .Where(s =>
                    s.user_id == userId &&
                    s.listing_status == status.ToString());

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(s => s.created_at)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new HostSpaceListingDto
                {
                    Id = s.id,
                    Title = s.title,
                    Address = s.address,
                    City = s.city.name,
                    ListingStatus = s.listing_status,
                    RejectionReason = s.rejection_reason,
                    CreatedAt = s.created_at,
                    ImageUrl = s.image_urls.FirstOrDefault()
                })
                .ToListAsync();

            return new PagedResultDto<HostSpaceListingDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<ApiResponseDto> UpdateParkingSpaceAsync(
            Guid userId,
            Guid spaceId,
            CreateParkingSpaceDto dto)
        {
            var space = await _context.parking_spaces
                .FirstOrDefaultAsync(s =>
                    s.id == spaceId &&
                    s.user_id == userId);

            if (space == null)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Listing not found."
                };
            }

            // Keep existing city when reapplying a rejected listing.
            var cityId = dto.CityId;

            if (space.listing_status == "rejected" &&
                cityId == Guid.Empty)
            {
                cityId = space.city_id;
            }

            if (space.listing_status == "rejected" &&
                cityId != space.city_id)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "State and city cannot be changed when reapplying a rejected listing."
                };
            }

            var cityExists = await _context.cities.AnyAsync(c =>
                c.id == cityId &&
                c.is_active &&
                c.state.is_active);

            if (!cityExists)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Selected city is invalid."
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
            var vehicleTypes = BuildVehicleTypes(
                dto.CarSlots,
                dto.BikeSlots);

            space.title = dto.Title.Trim();
            space.address = dto.Address.Trim();
            space.city_id = cityId;
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

            // Server-owned
            space.listing_status = "pending";
            space.reviewed_by = null;
            space.reviewed_at = null;
            space.rejection_reason = null;

            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var existingSlots = await _context.parking_slots
                    .Where(s => s.space_id == spaceId)
                    .ToListAsync();

                _context.parking_slots.RemoveRange(existingSlots);

                await _context.SaveChangesAsync();

                var newSlots = BuildSlots(
                    spaceId,
                    dto.CarSlots,
                    dto.BikeSlots);

                _context.parking_slots.AddRange(newSlots);

                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return new ApiResponseDto
                {
                    Success = true,
                    Message = "Listing resubmitted for review."
                };
            }
            catch
            {
                await transaction.RollbackAsync();

                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Failed to resubmit listing."
                };
            }
        }

        public async Task<PagedResultDto<ParkingSpaceDashboardDto>> SearchAsync(
            Guid? currentUserId,
            string? search,
            Guid? cityId,
            string? vehicleType,
            int page)
        {
            const int pageSize = 10;

            page = Math.Max(page, 1);

            var query = _context.parking_spaces
                .AsNoTracking()
                .Include(s => s.city)
                .Where(s =>
                    s.available &&
                    s.listing_status == "approved" &&
                    _context.parking_slots.Any(slot =>
                        slot.space_id == s.id &&
                        slot.is_active));

            if (currentUserId.HasValue)
            {
                query = query.Where(s => s.user_id != currentUserId.Value);
            }

            VehicleType? requestedVehicleType = null;

            if (!string.IsNullOrWhiteSpace(vehicleType))
            {
                if (Enum.TryParse<VehicleType>(
                    vehicleType.Trim(),
                    ignoreCase: true,
                    out var parsedVehicleType))
                {
                    requestedVehicleType = parsedVehicleType;
                }
            }

            // Search filter
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = search.Trim();

                query = query.Where(s =>
                    EF.Functions.ILike(s.title, $"%{searchTerm}%") ||
                    EF.Functions.ILike(s.city.name, $"%{searchTerm}%") ||
                    EF.Functions.ILike(s.address, $"%{searchTerm}%"));
            }

            // City filter
            if (cityId.HasValue)
            {
                query = query.Where(s => s.city_id == cityId.Value);
            }

            // Vehicle filter - ACTIVE slots only
            if (requestedVehicleType.HasValue)
            {
                query = query.Where(s =>
                    _context.parking_slots.Any(slot =>
                        slot.space_id == s.id &&
                        slot.is_active &&
                        slot.vehicle_type == requestedVehicleType.Value));
            }

            var totalCount = await query.CountAsync();

            var spaces = await query
                .OrderByDescending(s => s.created_at)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            if (spaces.Count == 0)
            {
                return new PagedResultDto<ParkingSpaceDashboardDto>
                {
                    Items = new List<ParkingSpaceDashboardDto>(),
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize
                };
            }

            var spaceIds = spaces
                .Select(s => s.id)
                .ToList();

            // Get ONLY active vehicle types for returned spaces
            var activeVehicleTypesBySpace = await _context.parking_slots
                .AsNoTracking()
                .Where(slot =>
                    spaceIds.Contains(slot.space_id) &&
                    slot.is_active)
                .GroupBy(slot => slot.space_id)
                .ToDictionaryAsync(
                    g => g.Key,
                    g => g
                        .Select(slot => slot.vehicle_type)
                        .Distinct()
                        .ToList());

            // Existing title update logic
            var titleUpdates = await _context.parking_space_update_requests
                .AsNoTracking()
                .Where(u =>
                    u.field == "title" &&
                    spaceIds.Contains(u.space_id) &&
                    (u.status == "APPROVED" ||
                     u.status == "PENDING"))
                .OrderByDescending(u => u.created_at)
                .ToListAsync();

            var latestTitleBySpace = titleUpdates
                .GroupBy(u => u.space_id)
                .ToDictionary(
                    g => g.Key,
                    g => g.First());

            var items = spaces.Select(s =>
            {
                var displayTitle = s.title;

                if (latestTitleBySpace.TryGetValue(s.id, out var update)
                    && !string.IsNullOrEmpty(update.old_value)
                    && !string.IsNullOrEmpty(update.new_value)
                    && update.new_value != update.old_value)
                {
                    displayTitle = $"{update.new_value} (earlier {update.old_value})";
                }

                return new ParkingSpaceDashboardDto
                {
                    Id = s.id,
                    Title = displayTitle,
                    Address = s.address,
                    City = s.city.name,
                    PricePerHour = s.price_per_hour,
                    VehicleTypes =
                        activeVehicleTypesBySpace.TryGetValue(
                            s.id,
                            out var activeVehicleTypes)
                            ? activeVehicleTypes
                                .Select(v => v.ToString().ToLower())
                                .ToList()
                            : new List<string>(),
                    Rating = s.rating,
                    ReviewCount = s.review_count,
                    ImageUrl = s.image_urls.FirstOrDefault(),
                    Lat = s.lat,
                    Lng = s.lng,
                    HasCctv = s.features.Contains("CCTV")
                };
            }).ToList();

            return new PagedResultDto<ParkingSpaceDashboardDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<ParkingSpaceSearchDto?> GetSpaceByIdAsync(Guid id, Guid? currentUserId)
        {
            var space = await _context.parking_spaces
                .Include(s => s.city)
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
                City = space.city.name,
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
                .Include(s => s.city).ThenInclude(c => c.state)
                .FirstOrDefaultAsync(s => s.id == spaceId && s.user_id == userId);

            if (space == null)
                return new UpdateSpaceDetailsResultDto { Success = false, Message = "Listing not found." };

            var now = DateTime.UtcNow;
            var errors = new Dictionary<string, string>();

            var titleChanged = dto.Title.Trim() != space.title;
            var addressChanged = dto.Address.Trim() != space.address;
            var featuresChanged = !FeaturesEqual(dto.Features, space.features);
            var pricePerHourChanged = dto.PricePerHour != space.price_per_hour;
            var pricePerDayChanged = dto.PricePerDay != space.price_per_day;

            if (titleChanged && ParkingSpaceCooldownHelper.IsCooldownActive(space.last_title_change_at))
            {
                errors["title"] = $"Can be changed after {ParkingSpaceCooldownHelper.GetRemainingDays(space.last_title_change_at)} days";
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

        public async Task<HostSpaceListingsCountDto> GetMySpaceListingsCountAsync(Guid userId)
        {
            var counts = await _context.parking_spaces
                .Where(s => s.user_id == userId)
                .GroupBy(s => 1)
                .Select(g => new HostSpaceListingsCountDto
                {
                    Total = g.Count(),
                    Pending = g.Count(s => s.listing_status == "pending"),
                    Approved = g.Count(s => s.listing_status == "approved"),
                    Rejected = g.Count(s => s.listing_status == "rejected")
                })
                .FirstOrDefaultAsync();

            return counts ?? new HostSpaceListingsCountDto();
        }

        public async Task<ApiResponseDto> CancelListingAsync(
            Guid userId,
            Guid spaceId)
        {
            var space = await _context.parking_spaces
                .FirstOrDefaultAsync(s =>
                    s.id == spaceId &&
                    s.user_id == userId);

            if (space == null)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Parking listing not found."
                };
            }

            // Only pending listings can be permanently deleted.
            if (space.listing_status != "pending")
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Only pending listings can be cancelled."
                };
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Delete parking slots belonging to this listing.
                var slots = await _context.parking_slots
                    .Where(s => s.space_id == spaceId)
                    .ToListAsync();

                _context.parking_slots.RemoveRange(slots);

                // Delete any update requests belonging to this listing.
                var updateRequests = await _context.parking_space_update_requests
                    .Where(r => r.space_id == spaceId)
                    .ToListAsync();

                _context.parking_space_update_requests.RemoveRange(updateRequests);

                // Delete the parking space itself.
                _context.parking_spaces.Remove(space);

                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return new ApiResponseDto
                {
                    Success = true,
                    Message = "Parking listing cancelled successfully."
                };
            }
            catch
            {
                await transaction.RollbackAsync();

                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Failed to cancel parking listing."
                };
            }
        }

        public async Task<ReapplyParkingSpaceDto?> GetReapplyDetailsAsync(
            Guid userId,
            Guid spaceId)
        {
            var space = await _context.parking_spaces
                .Include(s => s.city)
                .ThenInclude(c => c.state)
                .FirstOrDefaultAsync(s =>
                    s.id == spaceId &&
                    s.user_id == userId &&
                    s.listing_status == "rejected");

            if (space == null)
                return null;

            var slotCounts = await _context.parking_slots
                .Where(s => s.space_id == spaceId)
                .GroupBy(s => s.vehicle_type)
                .Select(g => new
                {
                    VehicleType = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var carSlots = slotCounts
                .FirstOrDefault(x => x.VehicleType == VehicleType.car)
                ?.Count ?? 0;

            var bikeSlots = slotCounts
                .FirstOrDefault(x => x.VehicleType == VehicleType.bike)
                ?.Count ?? 0;

            return new ReapplyParkingSpaceDto
            {
                Id = space.id,
                Title = space.title,
                Address = space.address,
                StateName = space.city.state.name,
                CityName = space.city.name,
                PricePerHour = space.price_per_hour,
                PricePerDay = space.price_per_day,
                CarSlots = carSlots,
                BikeSlots = bikeSlots,
                Features = space.features ?? new List<string>(),
                Description = space.description,
                ImageUrls = space.image_urls ?? new List<string>(),
                Lat = space.lat,
                Lng = space.lng
            };
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
                    vehicle_type = VehicleType.car,
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
                    vehicle_type = VehicleType.bike,
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