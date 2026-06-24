# Portfolio Case Study: Data Cleaner

## Problem
Small teams often receive messy CSV exports from CRMs, marketplaces, forms, and spreadsheets. The cleanup work is repetitive, error-prone, and risky when the data is sensitive.

## Build
Data Cleaner is a zero-dependency browser app that trims whitespace, removes empty rows and columns, deduplicates rows, standardizes headers, supports find/replace, previews changes, and exports cleaned CSV.

## Why it is useful
- Runs fully client-side, so private CSV data is not uploaded.
- Works offline by opening `index.html`.
- Gives a before/after preview so non-technical users can trust the result.
- Fits a small paid offer: "clean and normalize your lead/customer/product CSVs."

## Verification
- Live demo: https://ghravenlabs.github.io/Data-Cleaner-Tool/
- Screenshot: `assets/screenshot.png`
- Smoke check: `.github/workflows/smoke.yml`

## Next upgrades
- Add column type detection for dates, currency, and emails.
- Add a saved recipe system for repeat client cleanup jobs.
- Add sample messy datasets for sales demos.
