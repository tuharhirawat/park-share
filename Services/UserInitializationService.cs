using Microsoft.EntityFrameworkCore;
using Npgsql;
using ParkMitra_BE.Data;
using ParkMitra_BE.Models;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Infrastructure.Clients;
using System.Text.Json;

namespace ParkMitra_BE.Services
{
    public class UserInitializationService
    {
        private readonly ApplicationDbContext _context;
        private readonly IAuthProviderClient _supabaseAuthClient;

        public UserInitializationService(ApplicationDbContext context, IAuthProviderClient supabaseAuthClient)
        {
            _context = context;
            _supabaseAuthClient = supabaseAuthClient;
        }

        /// <summary>
        /// Creates profile, role and status history records if they do not already exist.
        /// Safe to call multiple times.
        /// Replaces Supabase handle_new_user trigger functionality.
        /// </summary>
        public async Task<bool> InitializeNewUserAsync(
            Guid userId,
            string fullName,
            string? mobileNumber,
            string email)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var existingProfile = await _context.profiles
                    .FirstOrDefaultAsync(p => p.user_id == userId);

                var existingUserRole = await _context.user_roles
                    .FirstOrDefaultAsync(ur =>
                        ur.user_id == userId &&
                        ur.role == UserRoles.User);

                var existingStatusHistory = await _context.user_status_histories
                    .FirstOrDefaultAsync(ush =>
                        ush.user_id == userId);

                var utcNow = DateTime.UtcNow;

                // Create profile only if missing
                if (existingProfile == null)
                {
                    var profile = new profile
                    {
                        user_id = userId,
                        full_name = fullName ?? string.Empty,
                        mobile_number = mobileNumber,
                        email = email,
                        current_status = "ACTIVE",
                        status_updated_on = utcNow,
                        created_at = utcNow,
                        updated_at = utcNow
                    };

                    _context.profiles.Add(profile);
                }

                // Create role only if missing
                if (existingUserRole == null)
                {
                    var userRole = new user_role
                    {
                        user_id = userId,
                        role = UserRoles.User,
                        created_at = utcNow
                    };

                    _context.user_roles.Add(userRole);
                }

                // Create status history only if missing
                if (existingStatusHistory == null)
                {
                    var statusHistory = new user_status_history
                    {
                        user_id = userId,
                        status = "ACTIVE",
                        reason = null,
                        changed_by = null,
                        created_at = utcNow
                    };

                    _context.user_status_histories.Add(statusHistory);
                }

                // Nothing to insert
                if (existingProfile != null &&
                    existingUserRole != null &&
                    existingStatusHistory != null)
                {
                    await transaction.CommitAsync();
                    return true;
                }

                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return true;
            }
            catch (DbUpdateException ex)
                when (ex.InnerException is PostgresException pg && pg.SqlState == PostgresErrorCodes.UniqueViolation)
            {
                await transaction.RollbackAsync();
                // Record already exists - treat as success
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                await transaction.RollbackAsync();
                return false;
            }
        }

        public async Task<user_auth_provider?> FindProviderAsync(
            AuthProvider provider,
            string providerUserId)
        {
            return await _context.user_auth_providers
                .FirstOrDefaultAsync(x =>
                    x.provider == provider &&
                    x.provider_user_id == providerUserId);
        }

        public async Task LinkProviderAsync(
            Guid userId,
            AuthProvider provider,
            string providerUserId)
        {
            var existing = await FindProviderAsync(provider, providerUserId);

            if (existing != null)
                return;

            _context.user_auth_providers.Add(new user_auth_provider
            {
                id = Guid.NewGuid(),
                user_id = userId,
                provider = provider,
                provider_user_id = providerUserId,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        public async Task<Guid> EnsureThirdPartyUserAsync(
            Guid userId,
            AuthProvider provider,
            string providerUserId,
            string email,
            string fullName)
        {
            var existingProviderLink = await FindProviderAsync(provider, providerUserId);

            if (existingProviderLink != null)
                return existingProviderLink.user_id;

            var existingProfile = await _context.profiles
                .FirstOrDefaultAsync(p => p.user_id == userId);

            if (existingProfile == null)
            {
                var initialized = await InitializeNewUserAsync(
                    userId,
                    fullName,
                    null,
                    email);

                if (!initialized)
                    throw new InvalidOperationException(
                        "Failed to initialize application user.");
            }

            await LinkProviderAsync(userId, provider, providerUserId);

            return userId;
        }
    }
}