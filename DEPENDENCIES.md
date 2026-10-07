# Article Migrate / Help Center Migrator — Dependencies and Configuration

Companion to [HANDOVER.md](HANDOVER.md). Based on repository documentation and configuration/source inspected on 7 October 2026; the live deployment must be reconciled before sign-off. Package manifests and lockfiles remain authoritative for exact transitive versions; this is the operational dependency list, not a frozen software bill of materials.

| Dependency | Required setup / configuration | Source or handover action |
| --- | --- | --- |
| Build | Node.js/npm, esbuild, motion; Python for packaging; Playwright for verification | package.json and package-lock.json; scripts/build.mjs; scripts/package.py |
| Runtime/API | Zendesk Support/Guide, ZAF SDK 2.0; Help Center categories, sections and articles APIs | Logged-in Zendesk session; no application backend, database or independent OAuth/API-key entry flow. |
| Ownership | Repository maintainer, source/target Guide administrator, private-app package/install access | Transfer app support identity and approved manifest metadata. |
| Data | CSV source and import result evidence | Confirm locale, draft state, parent hierarchy and target access before import. |

## API and OAuth completion requirements

For **every enabled API/OAuth integration**, record its accountable owner, provider/project, credential name, scopes, secret-store location, endpoint/redirect URI, expiry/renewal behavior and dependent consumers in the private operations register. Rotate/reissue all applicable keys, client secrets, tokens, grants and deployment credentials; configure each consumer; test the new identity; then revoke the superseded credentials. See the ordered procedure in [HANDOVER.md](HANDOVER.md).

Never put secret values in this file. If the live environment has additional integrations, add their non-secret dependency details before handover sign-off. Items absent from inspected source are unverified, not automatically unnecessary. This documentation update does not perform credential rotation or modify runtime settings.
