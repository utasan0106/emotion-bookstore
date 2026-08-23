# GA4 — Current Truth vs Future-Conditional Disclosure

## Current V3 Release

- The local analytics adapter exists.
- The event allowlist is fixed and payloads must be empty.
- No V3 measurement ID, Property, transport, `gtag`, or `dataLayer` is present.
- Runtime status is `MEASUREMENT_CONFIG_BLOCKED`.
- Analytics hosts/requests, cookies, and Product-created user properties are 0.
- Historical V2 configuration is not V3 authority and must not be reused.

Current Privacy wording must therefore say that V3 analytics transmission is
not active. It must not say that GA4 runs in V3 Production merely because V2
contains a historical destination.

## Future activation gates

Before any V3 GA4 activation, HQ must separately verify:

1. a V3-specific QA/Preview destination that cannot contaminate Production;
2. the intended V3 Production Property/stream;
3. property retention actually set to the 2-month candidate;
4. Google signals and advertising-personalization settings actually disabled;
5. no user-provided data, remarketing, emotion/profile user property, or
   content-identifying custom dimension;
6. Privacy/external-transmission copy updated before traffic starts.

Source constants are implementation candidates, not proof of GA4 Admin state.

## Exact future-conditional disclosure delta

> 将来、V3専用のGoogle Analytics 4送信先を確認して有効化した場合、利用状況と不具合の把握のため、許可された操作イベント名と通常の通信に伴う技術情報がGoogleへ送信されます。感情の棚、選んだ言葉、Experience・Editorial・作品・場所の識別情報、URL、気になるもの、予定、記録、本文、題名、写真、位置情報、個人識別子はイベントパラメータまたはユーザープロパティとして送信しません。現在は送信先が未設定で、V3からGA4への送信は行われていません。

The sentence above remains future-conditional. It does not authorize or enable
measurement and must be revisited against the actual verified Property.
