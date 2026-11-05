-- Contributions use exact amounts by default (no rounding).
alter table contribution_rules alter column rounding_cents set default 1;
