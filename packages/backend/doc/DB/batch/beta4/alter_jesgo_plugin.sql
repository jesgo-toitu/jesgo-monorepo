ALTER TABLE jesgo_plugin ADD COLUMN IF NOT EXISTS disabled boolean default false;
UPDATE jesgo_plugin SET disabled = false;
