-- Tamaño de la mascota (reporte + filtros): Pequeña, Mediana, Grande
ALTER TABLE pets ADD COLUMN IF NOT EXISTS size text;
