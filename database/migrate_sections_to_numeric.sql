-- Optional: convert existing letter sections to numbers (run once if you had A/B/C data)
USE mark_list_analysis;

UPDATE sections SET name = '1' WHERE UPPER(name) = 'A';
UPDATE sections SET name = '2' WHERE UPPER(name) = 'B';
UPDATE sections SET name = '3' WHERE UPPER(name) = 'C';
UPDATE sections SET name = '4' WHERE UPPER(name) = 'D';
UPDATE sections SET name = '5' WHERE UPPER(name) = 'E';
UPDATE sections SET name = '6' WHERE UPPER(name) = 'F';
