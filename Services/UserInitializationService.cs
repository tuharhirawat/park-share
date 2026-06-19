using Microsoft.EntityFrameworkCore;
using Npgsql;
using ParkMitra_BE.Data;
using ParkMitra_BE.Models;
using ParkMitra_BE.Enums;

namespace ParkMitra_BE.Services
{
    public class UserInitializationService
    {
        private readonly ApplicationDbContext _context;

        public UserInitializationService(ApplicationDbContext context)
        {
            _context = context;
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
    }
}