# Demo sandbox

Open https://explain-then-check.sociobot.in/demo or add ?demo=1 to the home URL.

The demo seeds a completed **Rate limiting** explanation and one due retry:
**How burst capacity changes a token bucket without removing the average limit**.
It shows the practice desk, a realistic completed explanation, recent activity,
and a focused retry immediately.

Demo data uses a separate IndexedDB database named
demo:explain-then-check. Demo drafts use the demo:etc: localStorage prefix.
Real records use explain-then-check and etc:. The two namespaces never
share reads or writes.

The persistent Demo banner has:

- **Reset demo** — clears the demo namespace and restores the shipped sample.
- **Start for real** — leaves demo mode and opens the real, unchanged notebook.

Deleting all records in demo intentionally leaves its demo desk empty until
Reset demo is selected. No demo action transfers records to real storage.
