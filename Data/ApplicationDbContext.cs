using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Data;

public partial class ApplicationDbContext : DbContext
{
    public ApplicationDbContext()
    {
    }

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<booking> bookings { get; set; }

    public virtual DbSet<contact_message> contact_messages { get; set; }

    public virtual DbSet<host> hosts { get; set; }

    public virtual DbSet<host_payout> host_payouts { get; set; }

    public virtual DbSet<parking_slot> parking_slots { get; set; }

    public virtual DbSet<parking_space> parking_spaces { get; set; }

    public virtual DbSet<parking_space_update_request> parking_space_update_requests { get; set; }

    public virtual DbSet<payment> payments { get; set; }

    public virtual DbSet<profile> profiles { get; set; }

    public virtual DbSet<review> reviews { get; set; }

    public virtual DbSet<user_role> user_roles { get; set; }

    public virtual DbSet<user_status_history> user_status_histories { get; set; }

    public virtual DbSet<vehicle> vehicles { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresEnum("auth", "aal_level", new[] { "aal1", "aal2", "aal3" })
            .HasPostgresEnum("auth", "code_challenge_method", new[] { "s256", "plain" })
            .HasPostgresEnum("auth", "factor_status", new[] { "unverified", "verified" })
            .HasPostgresEnum("auth", "factor_type", new[] { "totp", "webauthn", "phone" })
            .HasPostgresEnum("auth", "oauth_authorization_status", new[] { "pending", "approved", "denied", "expired" })
            .HasPostgresEnum("auth", "oauth_client_type", new[] { "public", "confidential" })
            .HasPostgresEnum("auth", "oauth_registration_type", new[] { "dynamic", "manual" })
            .HasPostgresEnum("auth", "oauth_response_type", new[] { "code" })
            .HasPostgresEnum("auth", "one_time_token_type", new[] { "confirmation_token", "reauthentication_token", "recovery_token", "email_change_token_new", "email_change_token_current", "phone_change_token" })
            .HasPostgresEnum("realtime", "action", new[] { "INSERT", "UPDATE", "DELETE", "TRUNCATE", "ERROR" })
            .HasPostgresEnum("realtime", "equality_op", new[] { "eq", "neq", "lt", "lte", "gt", "gte", "in" })
            .HasPostgresEnum("storage", "buckettype", new[] { "STANDARD", "ANALYTICS", "VECTOR" })
            .HasPostgresExtension("extensions", "pg_stat_statements")
            .HasPostgresExtension("extensions", "pgcrypto")
            .HasPostgresExtension("extensions", "uuid-ossp")
            .HasPostgresExtension("btree_gist")
            .HasPostgresExtension("vault", "supabase_vault");

        modelBuilder.Entity<booking>(entity =>
        {
            entity.HasKey(e => e.id).HasName("bookings_pkey");

            entity.HasIndex(e => new { e.original_start_time, e.original_end_time }, "idx_bookings_original_time");

            entity.HasIndex(e => e.space_id, "idx_bookings_space_id");

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.created_at).HasDefaultValueSql("now()");
            entity.Property(e => e.expires_at).HasColumnType("timestamp without time zone");
            entity.Property(e => e.free_extension_minutes_used)
                .HasDefaultValue(0)
                .HasComment("Number of grace-extension minutes used (0-15). Used to exclude grace time from paid-hour progression.");
            entity.Property(e => e.has_used_free_extension)
                .HasDefaultValue(false)
                .HasComment("Indicates if one-time free grace extension is used.");
            entity.Property(e => e.original_duration_minutes).HasComment("Original duration in minutes (used for delta pricing).");
            entity.Property(e => e.original_end_time)
                .HasComment("Initial booking end timestamp. Never update after creation.")
                .HasColumnType("timestamp without time zone");
            entity.Property(e => e.original_start_time)
                .HasComment("Initial booking start timestamp. Never update after creation.")
                .HasColumnType("timestamp without time zone");
            entity.Property(e => e.status).HasDefaultValueSql("'confirmed'::text");
            entity.Property(e => e.updated_at).HasDefaultValueSql("now()");
            entity.Property(e => e.vehicle_type).HasDefaultValueSql("'car'::text");

            entity.HasOne(d => d.slot).WithMany(p => p.bookings)
                .HasForeignKey(d => d.slot_id)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("bookings_slot_id_fkey");

            entity.HasOne(d => d.space).WithMany(p => p.bookings)
                .HasForeignKey(d => d.space_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("bookings_space_id_fkey");

            entity.HasOne(d => d.user).WithMany(p => p.bookings)
                .HasPrincipalKey(p => p.user_id)
                .HasForeignKey(d => d.user_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("bookings_user_profile_fkey");

            entity.HasOne(d => d.vehicle).WithMany(p => p.bookings)
                .HasForeignKey(d => d.vehicle_id)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("bookings_vehicle_id_fkey");
        });

        modelBuilder.Entity<contact_message>(entity =>
        {
            entity.HasKey(e => e.id).HasName("contact_messages_pkey");

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.created_at)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone");
            entity.Property(e => e.resolved).HasDefaultValue(false);
        });

        modelBuilder.Entity<host>(entity =>
        {
            entity.HasKey(e => e.id).HasName("hosts_pkey");

            entity.HasIndex(e => e.user_id, "hosts_user_id_key").IsUnique();

            entity.HasIndex(e => e.user_id, "idx_hosts_user_id");

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");

            entity.HasOne(d => d.user).WithOne(p => p.host)
                .HasPrincipalKey<profile>(p => p.user_id)
                .HasForeignKey<host>(d => d.user_id)
                .HasConstraintName("fk_hosts_user");
        });

        modelBuilder.Entity<host_payout>(entity =>
        {
            entity.HasKey(e => e.id).HasName("host_payouts_pkey");

            entity.HasIndex(e => e.host_id, "idx_host_payouts_host_id");

            entity.HasIndex(e => e.paid_at, "idx_host_payouts_paid_at");

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.amount).HasPrecision(10, 2);
            entity.Property(e => e.created_at).HasDefaultValueSql("now()");

            entity.HasOne(d => d.host).WithMany(p => p.host_payouts)
                .HasForeignKey(d => d.host_id)
                .HasConstraintName("fk_host_payouts_host");
        });

        modelBuilder.Entity<parking_slot>(entity =>
        {
            entity.HasKey(e => e.id).HasName("parking_slots_pkey");

            entity.HasIndex(e => new { e.space_id, e.label }, "parking_slots_space_id_label_key").IsUnique();

            entity.HasIndex(e => new { e.space_id, e.label }, "unique_slot_per_space").IsUnique();

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.created_at).HasDefaultValueSql("now()");
            entity.Property(e => e.is_active).HasDefaultValue(true);
            entity.Property(e => e.updated_at).HasDefaultValueSql("now()");

            entity.HasOne(d => d.space).WithMany(p => p.parking_slots)
                .HasForeignKey(d => d.space_id)
                .HasConstraintName("parking_slots_space_id_fkey");
        });

        modelBuilder.Entity<parking_space>(entity =>
        {
            entity.HasKey(e => e.id).HasName("parking_spaces_pkey");

            entity.HasIndex(e => e.listing_status, "idx_parking_spaces_listing_status");

            entity.HasIndex(e => new { e.user_id, e.listing_status }, "idx_parking_spaces_user_status");

            entity.HasIndex(e => e.user_id, "idx_spaces_host");

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.available).HasDefaultValue(true);
            entity.Property(e => e.created_at).HasDefaultValueSql("now()");
            entity.Property(e => e.features).HasDefaultValueSql("'{}'::text[]");
            entity.Property(e => e.image_urls).HasDefaultValueSql("'{}'::text[]");
            entity.Property(e => e.listing_status).HasDefaultValueSql("'pending'::text");
            entity.Property(e => e.reapply_count).HasDefaultValue(0);
            entity.Property(e => e.review_count).HasDefaultValue(0);
            entity.Property(e => e.updated_at).HasDefaultValueSql("now()");
            entity.Property(e => e.vehicle_types).HasDefaultValueSql("'{}'::text[]");

            entity.HasOne(d => d.user).WithMany(p => p.parking_spaces)
                .HasPrincipalKey(p => p.user_id)
                .HasForeignKey(d => d.user_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("parking_spaces_user_profile_fkey");
        });

        modelBuilder.Entity<parking_space_update_request>(entity =>
        {
            entity.HasKey(e => e.id).HasName("parking_space_update_requests_pkey");

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.created_at).HasDefaultValueSql("now()");
            entity.Property(e => e.status).HasDefaultValueSql("'PENDING'::text");

            entity.HasOne(d => d.space).WithMany(p => p.parking_space_update_requests)
                .HasForeignKey(d => d.space_id)
                .HasConstraintName("parking_space_update_requests_space_id_fkey");
        });

        modelBuilder.Entity<payment>(entity =>
        {
            entity.HasKey(e => e.id).HasName("payments_pkey");

            entity.HasIndex(e => e.booking_id, "idx_payment_booking");

            entity.HasIndex(e => e.status, "idx_payment_status");

            entity.HasIndex(e => e.user_id, "idx_payment_user");

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.base_price).HasPrecision(10, 2);
            entity.Property(e => e.created_at).HasDefaultValueSql("now()");
            entity.Property(e => e.currency).HasDefaultValueSql("'INR'::text");
            entity.Property(e => e.discount_amount).HasDefaultValueSql("0");
            entity.Property(e => e.gateway_name).HasDefaultValueSql("'razorpay'::text");
            entity.Property(e => e.gst_amount).HasPrecision(10, 2);
            entity.Property(e => e.host_commission).HasPrecision(10, 2);
            entity.Property(e => e.host_payout).HasPrecision(10, 2);
            entity.Property(e => e.platform_fee).HasPrecision(10, 2);
            entity.Property(e => e.refund_amount).HasDefaultValueSql("0");
            entity.Property(e => e.total_payable).HasPrecision(10, 2);

            entity.HasOne(d => d.booking).WithMany(p => p.payments)
                .HasForeignKey(d => d.booking_id)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("payments_booking_id_fkey");
        });

        modelBuilder.Entity<profile>(entity =>
        {
            entity.HasKey(e => e.id).HasName("profiles_pkey");

            entity.HasIndex(e => e.email, "profiles_email_unique").IsUnique();

            entity.HasIndex(e => e.user_id, "profiles_user_id_key").IsUnique();

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.created_at).HasDefaultValueSql("now()");
            entity.Property(e => e.current_status).HasDefaultValueSql("'ACTIVE'::text");
            entity.Property(e => e.full_name).HasDefaultValueSql("''::text");
            entity.Property(e => e.is_host).HasDefaultValue(false);
            entity.Property(e => e.is_phone_verified).HasDefaultValue(false);
            entity.Property(e => e.status_updated_on).HasDefaultValueSql("now()");
            entity.Property(e => e.updated_at).HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<review>(entity =>
        {
            entity.HasKey(e => e.id).HasName("reviews_pkey");

            entity.HasIndex(e => e.booking_id, "idx_reviews_booking_id");

            entity.HasIndex(e => new { e.space_id, e.created_at }, "idx_reviews_space_created").IsDescending(false, true);

            entity.HasIndex(e => new { e.space_id, e.user_id }, "idx_reviews_space_user");

            entity.HasIndex(e => new { e.space_id, e.user_id, e.updated_at }, "idx_reviews_space_user_updated").IsDescending(false, false, true);

            entity.HasIndex(e => e.user_id, "idx_reviews_user_id");

            entity.HasIndex(e => e.booking_id, "reviews_booking_unique").IsUnique();

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.created_at).HasDefaultValueSql("now()");
            entity.Property(e => e.updated_at).HasDefaultValueSql("now()");

            entity.HasOne(d => d.booking).WithOne(p => p.review)
                .HasForeignKey<review>(d => d.booking_id)
                .HasConstraintName("reviews_booking_id_fkey");

            entity.HasOne(d => d.space).WithMany(p => p.reviews)
                .HasForeignKey(d => d.space_id)
                .HasConstraintName("reviews_space_id_fkey");

            entity.HasOne(d => d.user).WithMany(p => p.reviews)
                .HasPrincipalKey(p => p.user_id)
                .HasForeignKey(d => d.user_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("reviews_user_fk");
        });

        modelBuilder.Entity<user_role>(entity =>
        {
            entity.HasKey(e => e.id).HasName("user_roles_pkey");

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.created_at).HasDefaultValueSql("now()");
            entity.Property(e => e.role).HasConversion(
                v => v.ToString().ToLower(),
                v => Enum.Parse<UserRoles>(v, true)
            );
        });

        modelBuilder.Entity<user_status_history>(entity =>
        {
            entity.HasKey(e => e.id).HasName("user_status_history_pkey");

            entity.ToTable("user_status_history");

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.created_at).HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<vehicle>(entity =>
        {
            entity.HasKey(e => e.id).HasName("vehicles_pkey");

            entity.HasIndex(e => e.registration_number, "idx_vehicle_reg_unique").IsUnique();

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.brand_model).HasDefaultValueSql("''::text");
            entity.Property(e => e.created_at).HasDefaultValueSql("now()");
            entity.Property(e => e.updated_at).HasDefaultValueSql("now()");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
