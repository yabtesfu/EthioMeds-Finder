INSERT INTO users (full_name, email, password_hash, role)
VALUES
('Admin User', 'admin@ethiomeds.com', 'temporary_password_hash', 'admin'),
('Tena Pharmacy Owner', 'tena@example.com', 'temporary_password_hash', 'pharmacy'),
('Patient User', 'patient@example.com', 'temporary_password_hash', 'patient');

INSERT INTO pharmacies (user_id, name, phone, city, sub_city, address, is_approved)
VALUES
(2, 'Tena Pharmacy', '+251911111111', 'Addis Ababa', 'Bole', 'Near Bole Medhanialem', TRUE);

INSERT INTO medicines (name, generic_name, description)
VALUES
('Paracetamol', 'Acetaminophen', 'Used for pain relief and fever reduction'),
('Amoxicillin', 'Amoxicillin', 'Antibiotic used for bacterial infections'),
('Ibuprofen', 'Ibuprofen', 'Used for pain, fever, and inflammation');

INSERT INTO pharmacy_medicines (pharmacy_id, medicine_id, quantity, price, is_available)
VALUES
(1, 1, 50, 25.00, TRUE),
(1, 2, 20, 120.00, TRUE),
(1, 3, 35, 40.00, TRUE);