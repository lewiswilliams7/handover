-- Reset scheduled report rows that only have a subset of tabs so they get the full default.
UPDATE scheduled_reports
SET excel_tabs = NULL
WHERE excel_tabs IS NOT NULL
  AND array_length(excel_tabs, 1) < 5;
