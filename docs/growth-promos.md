# Growth promos and reactivation

## Free promo links

Available promo codes:

```text
premium30
premium7
family30
family7
```

The backend gives the authenticated user the matching subscription after
redeeming a code. Each user can redeem each code only once.

Recommended Telegram Mini App links for QR:

```text
https://t.me/SmartPetHelper_bot?startapp=premium30
https://t.me/SmartPetHelper_bot?startapp=premium7
https://t.me/SmartPetHelper_bot?startapp=family30
https://t.me/SmartPetHelper_bot?startapp=family7
```

VK Mini App links:

```text
https://vk.ru/app54599546#promo=premium30
https://vk.ru/app54599546#promo=premium7
https://vk.ru/app54599546#promo=family30
https://vk.ru/app54599546#promo=family7
```

Fallback web links:

```text
https://smartpet-lunyc.amvera.io/?promo=premium30
https://smartpet-lunyc.amvera.io/?promo=premium7
https://smartpet-lunyc.amvera.io/?promo=family30
https://smartpet-lunyc.amvera.io/?promo=family7
```

Use the Telegram link for QR campaigns, because Telegram passes `startapp` into
the Mini App after the user opens it. Use the VK link for VK campaigns; VK keeps
the hash part after `app54599546`, and the Mini App reads `promo` from it after
VK auth identifies the user. The fallback web links redirect browser users to
the Telegram link.

## Amvera environment variables

Optional promo settings:

```text
PROMO_PREMIUM_CODE=premium30
PROMO_PREMIUM_DAYS=30
```

These settings are kept for compatibility with the original `premium30` promo.
The fixed promo codes above work without additional Amvera variables.

Inactive user messages are disabled by default. To enable Telegram reactivation:

```text
RUN_INACTIVE_USER_MESSAGES=true
INACTIVE_USER_DAYS=3
INACTIVE_MESSAGE_COOLDOWN_DAYS=7
```

This sends a Telegram message only to users who have opened the Mini App before,
have a Telegram ID, and have not opened it for the configured number of days.
The cooldown prevents repeated messages every day.

Subscription expiry messages are also disabled by default. To warn Telegram users
before their paid access ends:

```text
RUN_SUBSCRIPTION_EXPIRY_MESSAGES=true
SUBSCRIPTION_EXPIRY_NOTICE_DAYS=3,1
```

With these values, users get one message when 3 days remain and one more message
when 1 day remains. Messages are deduplicated per subscription end date.

## Breeder plan and pet transfer

The `breeder` plan unlocks breeder tools inside the same user account. It has
all family-plan limits plus pet transfer by invite link.

Admin subscription update example:

```powershell
$body = @{
  plan = "breeder"
  expires_at = "2026-12-31T00:00:00Z"
} | ConvertTo-Json -Compress

Invoke-RestMethod `
  -Method Post `
  -Uri "https://smartpet-lunyc.amvera.io/admin/platform-users/telegram/USER_ID/subscription" `
  -Headers @{ Authorization = "Bearer ADMIN_SECRET" } `
  -ContentType "application/json" `
  -Body $body
```

After a breeder creates a transfer from the pet passport, the app generates:

```text
https://t.me/SmartPetHelper_bot?startapp=transfer_TOKEN
https://vk.ru/app54599546#transfer=TOKEN
https://smartpet-lunyc.amvera.io/transfer/TOKEN
```

The invite is valid for 14 days. When the new owner accepts it, the pet,
reminders, and health-check history move to the new owner account.
