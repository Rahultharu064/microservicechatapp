-- Fix waveform column size issue
-- Run this SQL script in your MySQL database

USE chatapp_media;

ALTER TABLE voicemessage MODIFY COLUMN waveform TEXT;

-- Verify the change
DESCRIBE voicemessage;
