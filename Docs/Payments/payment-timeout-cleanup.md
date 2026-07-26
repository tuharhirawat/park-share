# Payment Timeout & Automatic Cleanup

## The Problem

When someone starts booking a parking slot, we reserve it for them immediately — before they've actually paid. That's good for UX, but it creates a risk: what if they never pay? The slot would stay blocked forever, and no one else could book it.

So we needed two things:
1. A way to free up the slot if the user never pays.
2. A way to reliably confirm the booking if they do pay — even if their browser closes right after.

This doc covers both.

---

## The Lifecycle, in Plain Terms

```
Booking created → Pending
       │
       ├── Payment succeeds ──────────► Confirmed ✅
       │
       └── No payment within 5 min ───► PaymentAbandoned (slot freed) 
```

That's really the whole system. Everything below is just how each of those two outcomes actually happens.

---

## Part 1: Confirming a Payment (Two Ways In, One Door)

There are two different ways we find out a payment succeeded:

1. The frontend tells us. After the user pays, Razorpay hands control back to our React app, which calls our backend (VerifyPayment) to confirm it. This is the normal, fast path — happens in a second or two.

2. Razorpay tells us directly, through a webhook. Independently of the user's browser, Razorpay also sends our backend a message the moment the payment succeeds. This matters because browsers aren't reliable — the user might close the tab, lose internet, or the app might crash right after paying, before path 1 ever gets a chance to run.

Both paths lead to the exact same function: CompletePaymentAsync. It doesn't matter which one calls it — the booking gets confirmed the same way either time. Think of it as one door with two hallways leading to it.

Why this is safe, not messy: the very first thing CompletePaymentAsync checks is "is this payment already marked Paid?" If yes, it just stops. So if both paths happen to fire (which is normal — most of the time they both do), the second one is harmless — it just says "yep, already done" and exits.

Before confirming, it double-checks the slot is still free. Since a little time passes during checkout, it's technically possible someone else grabbed the same slot in the meantime. If that happened, instead of confirming, we automatically refund the payment and cancel the booking, and let the user know.

Real-world test we ran: we started a payment, let it succeed, and closed the browser tab immediately — before the frontend could confirm anything. The webhook alone picked it up, and the booking showed as Confirmed. That's the exact scenario this was built for, and it works.

---

## Part 2: Cleaning Up Abandoned Bookings

This part hasn't changed — it's the safety net for people who genuinely never pay at all (closed the payment popup, changed their mind, walked away).

- Timeout: 5 minutes (stored in the system_settings table, key payment_timeout_minutes)
- Checked every: 2 minutes, by a Postgres job (pg_cron) that calls cleanup_expired_pending_bookings_and_payments()
- What it touches: only bookings that are still Pending and still unpaid after 5 minutes. Anything already Confirmed, Cancelled, Failed, or Refunded is left alone.
- What it does: flips them to PaymentAbandoned, which frees the slot for someone else.

We run this in the database rather than the backend app for a simple reason: it keeps working even if the backend restarts or crashes, and it doesn't need any extra service running.

---

## Setting Up the Webhook

In Razorpay's Dashboard → Webhooks:
- URL: your backend's /api/Payment/Webhook endpoint
- Secret: a random string — set it here, and put the same value in the backend config (Razorpay:WebhookSecret). This is different from your API key/secret.
- Event to enable: payment.captured

Test Mode and Live Mode each need their own webhook entry with their own secret — going live isn't just flipping a switch, it's adding a new one.

### A note on local development (ngrok)

While developing locally, the webhook points at an ngrok tunnel, since Razorpay needs a public URL to reach our machine. The important thing to know: every time ngrok is restarted, it generates a brand new URL. The old one stops working.

That means after every ngrok restart, the Webhook URL in the Razorpay Dashboard has to be manually updated to match the new one — otherwise Razorpay will keep trying to deliver payment confirmations to a tunnel that no longer exists, and nothing will notice or warn you. The symptom would only show up if a user's browser closes mid-payment, since that's the one case relying purely on the webhook to confirm the booking.

---

## Quick Reference

| What happened                                   | Result                          |
|--------------------------------------------------|----------------------------------|
| Payment succeeds, browser stays open              | Confirmed                        |
| Payment succeeds, browser closes right after       | Confirmed (webhook saves it)     |
| User closes the payment popup without paying       | PaymentAbandoned, slot freed     |
| Payment fails                                       | PaymentFailed                    |
| User just walks away, nothing happens at all        | PaymentAbandoned after 5 min (cleanup job) |

---

That's the whole system: confirm reliably through two paths that never conflict, and clean up anything left truly unpaid. Both pieces have been tested and are working.