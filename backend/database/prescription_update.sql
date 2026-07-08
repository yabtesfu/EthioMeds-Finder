ALTER TABLE medicines
ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT FALSE;

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS face_photo_path TEXT,
ADD COLUMN IF NOT EXISTS id_card_path TEXT,
ADD COLUMN IF NOT EXISTS prescription_file_path TEXT,
ADD COLUMN IF NOT EXISTS prescription_expiry_date DATE,
ADD COLUMN IF NOT EXISTS prescription_status VARCHAR(30) DEFAULT 'not_required'
CHECK (
  prescription_status IN (
    'not_required',
    'required',
    'submitted',
    'approved',
    'rejected'
  )
);