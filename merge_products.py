#!/usr/bin/env python3
"""
Merge product CSVs:
- Base: products_export_fresh_import.csv (keeps image URLs)
- Updates from: products_export_optimized.csv (titles, descriptions, SEO, etc.)
- Output: products_merged.csv
"""

import csv
from difflib import SequenceMatcher

def similarity(a, b):
    """Calculate string similarity ratio."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def get_base_handle(handle):
    """Extract base handle for matching (remove common prefixes/suffixes)."""
    return handle.lower().replace('-', ' ')

# Columns that contain image URLs - these should NOT be pulled from optimized
IMAGE_COLUMNS = ['Image Src', 'Image Position', 'Image Alt Text', 'Variant Image']

# Read fresh import (base file)
fresh_products = []
with open('products_export_fresh_import.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fresh_headers = reader.fieldnames
    for row in reader:
        fresh_products.append(row)

print(f"Fresh import: {len(fresh_products)} rows")

# Read optimized file
optimized_products = []
with open('products_export_optimized.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    optimized_headers = reader.fieldnames
    for row in reader:
        optimized_products.append(row)

print(f"Optimized: {len(optimized_products)} rows")

# Build a lookup of optimized products by handle
# Group rows by handle (since products have multiple rows for variants/images)
optimized_by_handle = {}
for row in optimized_products:
    handle = row['Handle']
    if handle not in optimized_by_handle:
        optimized_by_handle[handle] = []
    optimized_by_handle[handle].append(row)

# Also build lookup by title for fuzzy matching
optimized_by_title = {}
for row in optimized_products:
    title = row.get('Title', '').strip()
    if title and title not in optimized_by_title:
        optimized_by_title[title] = row['Handle']

# Group fresh products by handle
fresh_by_handle = {}
for row in fresh_products:
    handle = row['Handle']
    if handle not in fresh_by_handle:
        fresh_by_handle[handle] = []
    fresh_by_handle[handle].append(row)

print(f"\nFresh import unique products: {len(fresh_by_handle)}")
print(f"Optimized unique products: {len(optimized_by_handle)}")

# Try to match fresh handles to optimized handles
handle_mapping = {}
unmatched_fresh = []

for fresh_handle in fresh_by_handle.keys():
    # First, try exact match
    if fresh_handle in optimized_by_handle:
        handle_mapping[fresh_handle] = fresh_handle
        continue

    # Try to find best match by title similarity
    fresh_title = fresh_by_handle[fresh_handle][0].get('Title', '').strip()
    if fresh_title:
        best_match = None
        best_score = 0
        for opt_handle, opt_rows in optimized_by_handle.items():
            opt_title = opt_rows[0].get('Title', '').strip()
            if opt_title:
                score = similarity(fresh_title, opt_title)
                if score > best_score:
                    best_score = score
                    best_match = opt_handle

        if best_score >= 0.5:  # Threshold for matching
            handle_mapping[fresh_handle] = best_match
            print(f"Matched: '{fresh_handle}' -> '{best_match}' (score: {best_score:.2f})")
            print(f"   Fresh title: {fresh_title[:60]}...")
            print(f"   Opt title:   {opt_rows[0].get('Title', '')[:60]}...")
        else:
            unmatched_fresh.append(fresh_handle)
            print(f"No match for: '{fresh_handle}' (best score: {best_score:.2f})")
    else:
        unmatched_fresh.append(fresh_handle)

print(f"\nMatched: {len(handle_mapping)} products")
print(f"Unmatched: {len(unmatched_fresh)} products")

# Create merged output
merged_rows = []

for fresh_handle, fresh_rows in fresh_by_handle.items():
    if fresh_handle in handle_mapping:
        opt_handle = handle_mapping[fresh_handle]
        opt_rows = optimized_by_handle[opt_handle]

        # Merge rows - match by variant/image position
        for i, fresh_row in enumerate(fresh_rows):
            merged_row = dict(fresh_row)  # Start with fresh data

            # Find corresponding optimized row
            if i < len(opt_rows):
                opt_row = opt_rows[i]

                # Pull over all non-image data from optimized
                for col in fresh_headers:
                    if col not in IMAGE_COLUMNS and opt_row.get(col):
                        merged_row[col] = opt_row[col]

            # Keep the fresh handle (to maintain consistency with images)
            merged_row['Handle'] = fresh_handle

            merged_rows.append(merged_row)
    else:
        # No match - keep fresh data as-is
        for fresh_row in fresh_rows:
            merged_rows.append(dict(fresh_row))

print(f"\nTotal merged rows: {len(merged_rows)}")

# Write output
with open('products_merged.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fresh_headers)
    writer.writeheader()
    writer.writerows(merged_rows)

print("\nOutput written to: products_merged.csv")
