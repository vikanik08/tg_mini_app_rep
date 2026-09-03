# Growth promos and reactivation

## Free Premium promo link

Default promo code:

```text
premium30
```

The backend gives the authenticated user `premium` for 30 days after redeeming
this code. Each user can redeem the code only once.

Recommended Telegram Mini App link for QR:

```text
https://t.me/SmartPetHelper_bot?startapp=premium30
```

Fallback web link:

```text
https://smartpet-lunyc.amvera.io/?promo=premium30
```

Use the Telegram link for QR campaigns, because Telegram passes `startapp` into
the Mini App after the user opens it.

## Amvera environment variables

Optional promo settings:

```text
PROMO_PREMIUM_CODE=premium30
PROMO_PREMIUM_DAYS=30
```

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
