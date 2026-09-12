using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.DTOs.Payment;
using ParkMitra_BE.Infrastructure.Clients;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentController : ControllerBase
    {
        private readonly PaymentService _paymentService;
        private readonly CurrentUserService _currentUserService;
        private readonly IPaymentGatewayClient _paymentGatewayClient;

        public PaymentController(PaymentService paymentService, CurrentUserService currentUserService, IPaymentGatewayClient paymentGatewayClient)
        {
            _paymentService = paymentService;
            _currentUserService = currentUserService;
            _paymentGatewayClient = paymentGatewayClient;
        }

        [HttpPost("CreatePaymentOrder")]
        public async Task<IActionResult> CreatePaymentOrder([FromBody] CreatePaymentOrderRequestDto request)
        {
            var accessToken = Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);

            if (currentUser == null)
                return Unauthorized();

            var result = await _paymentService.CreatePaymentOrderAsync(
                    currentUser.UserId,
                    request.PaymentId);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }

        [HttpPost("VerifyPayment")]
        public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentRequestDto request)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _paymentService.VerifyPaymentAsync(currentUser.UserId, request);

            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("MarkPaymentAbandoned")]
        public async Task<IActionResult> MarkPaymentAbandoned([FromBody] BookingIdRequestDto request)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            await _paymentService.MarkPaymentAbandonedAsync(currentUser.UserId, request.BookingId);
            return Ok(new { success = true });
        }

        [HttpPost("MarkPaymentFailed")]
        public async Task<IActionResult> MarkPaymentFailed([FromBody] BookingIdRequestDto request)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            await _paymentService.MarkPaymentFailedAsync(currentUser.UserId, request.BookingId);
            return Ok(new { success = true });
        }

        [HttpPost("RazorpayWebhook")]
        public async Task<IActionResult> RazorpayWebhook()
        {
            using var reader = new StreamReader(Request.Body);
            var requestBody = await reader.ReadToEndAsync();

            var signature = Request.Headers["X-Razorpay-Signature"].FirstOrDefault();

            if (string.IsNullOrWhiteSpace(signature))
                return Unauthorized();

            if (!_paymentGatewayClient.VerifyWebhookSignature(requestBody, signature))
                return Unauthorized();

            await _paymentService.SyncPaymentStatusFromGatewayAsync(requestBody);

            return Ok();
        }
    }
}