Public Assets
=============

This folder contains static assets copied verbatim into the build output.

Files:

- offline.html: Offline fallback page used by the service worker navigateFallback.

Governance:

- Keep offline.html lightweight (<10KB) and dependency-free.
- Build metadata (build-meta.json) is fetched opportunistically for diagnostics.
